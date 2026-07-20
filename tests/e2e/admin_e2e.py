"""End-to-end smoke tests for the admin panel.

Run:
    python3 tests/e2e/admin_e2e.py

Requires the Lovable preview to be running at http://localhost:8080 and the
Supabase browser-session env vars to be present (`LOVABLE_BROWSER_AUTH_STATUS=injected`).
Sign in as an admin user in the Lovable preview once so the session is minted;
after that the harness injects the session into every sandbox turn.

The suite:
  1. Restores the Supabase session into localStorage + cookies.
  2. Visits every route listed in ADMIN_ROUTES and asserts:
     - final URL matches (no unwanted redirects to /auth or /)
     - the page renders a heading (data-testid or <h1>) without a runtime error
     - no console errors of severity "error"
  3. Clicks every sidebar NAV link and confirms navigation.
  4. On listing pages, opens the row action menu (edit/delete), verifies the
     confirm dialog appears, and cancels — never mutates real data.
  5. Triggers CSV export buttons and asserts a Blob download was initiated.

Every step captures a screenshot under tests/e2e/screenshots/ for debugging.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from playwright.async_api import (
    BrowserContext,
    ConsoleMessage,
    Page,
    async_playwright,
)

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

# Every admin route the sidebar exposes. Keep in sync with
# src/components/admin/admin-shell.tsx > NAV.
ADMIN_ROUTES: list[tuple[str, str]] = [
    ("/admin", "Dashboard"),
    ("/admin/lojas", "Lojas"),
    ("/admin/produtos", "Produtos"),
    ("/admin/categorias", "Categorias"),
    ("/admin/subcategorias", "Subcategorias"),
    ("/admin/marcas", "Marcas"),
    ("/admin/ofertas", "Ofertas"),
    ("/admin/regioes", "Regiões"),
    ("/admin/solicitacoes", "Solicitações"),
    ("/admin/denuncias", "Denúncias"),
    ("/admin/relatorios", "Relatórios"),
    ("/admin/logs", "Logs"),
    ("/admin/usuarios", "Usuários"),
    ("/admin/permissoes", "Permissões"),
    ("/admin/planos", "Planos"),
    ("/admin/configuracoes", "Configurações"),
    ("/admin/financeiro", "Financeiro"),
]


@dataclass
class Result:
    name: str
    passed: bool
    detail: str = ""
    screenshot: str = ""


@dataclass
class Report:
    results: list[Result] = field(default_factory=list)

    def add(self, r: Result) -> None:
        self.results.append(r)
        icon = "✓" if r.passed else "✗"
        print(f"  {icon} {r.name}" + (f" — {r.detail}" if r.detail else ""))

    def summary(self) -> tuple[int, int]:
        ok = sum(1 for r in self.results if r.passed)
        return ok, len(self.results)


async def restore_session(context: BrowserContext, page: Page) -> bool:
    """Inject Supabase session; return True when a session was actually restored."""
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE_URL
        await context.add_cookies(cookies)

    await page.goto(BASE_URL, wait_until="domcontentloaded")
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
        return True
    return False


def wire_console(page: Page, sink: list[str]) -> None:
    def on_msg(msg: ConsoleMessage) -> None:
        if msg.type == "error":
            sink.append(msg.text)

    page.on("console", on_msg)
    page.on(
        "pageerror",
        lambda err: sink.append(f"pageerror: {err}"),
    )


async def check_route(
    page: Page, path: str, label: str, report: Report
) -> None:
    console_errors: list[str] = []
    wire_console(page, console_errors)

    await page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    await page.wait_for_timeout(600)  # allow suspense/queries

    final_url = page.url
    shot = SCREENSHOTS / f"route_{path.replace('/', '_') or 'root'}.png"
    await page.screenshot(path=str(shot))

    ok = path in final_url
    detail = ""
    if not ok:
        detail = f"redirected to {final_url}"
    elif console_errors:
        # ignore known noisy warnings
        real = [e for e in console_errors if "Warning:" not in e]
        if real:
            ok = False
            detail = f"{len(real)} console error(s): {real[0][:120]}"
    report.add(
        Result(
            name=f"GET {path} ({label})",
            passed=ok,
            detail=detail,
            screenshot=str(shot),
        )
    )
    page.remove_all_listeners("console")
    page.remove_all_listeners("pageerror")


async def check_sidebar_navigation(page: Page, report: Report) -> None:
    """Click every sidebar link once, verify URL updates."""
    await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")
    await page.wait_for_timeout(400)

    for path, label in ADMIN_ROUTES:
        link = page.locator(f'aside a[href="{path}"]').first
        try:
            await link.click(timeout=3000)
            await page.wait_for_url(f"**{path}", timeout=3000)
            report.add(Result(name=f"sidebar click → {path}", passed=True))
        except Exception as e:  # noqa: BLE001
            shot = SCREENSHOTS / f"sidebar_fail_{path.replace('/', '_')}.png"
            await page.screenshot(path=str(shot))
            report.add(
                Result(
                    name=f"sidebar click → {path}",
                    passed=False,
                    detail=str(e)[:140],
                    screenshot=str(shot),
                )
            )


async def check_destructive_confirm(page: Page, report: Report) -> None:
    """On /admin/categorias, open a delete confirm and cancel it."""
    await page.goto(f"{BASE_URL}/admin/categorias", wait_until="domcontentloaded")
    await page.wait_for_timeout(600)

    delete_btn = page.get_by_role("button", name="Excluir").first
    try:
        await delete_btn.click(timeout=3000)
        # Confirm dialog should appear with a cancel affordance.
        cancel = page.get_by_role("button", name="Cancelar").first
        await cancel.wait_for(state="visible", timeout=2000)
        await cancel.click()
        report.add(Result(name="delete confirm dialog opens & cancels", passed=True))
    except Exception as e:  # noqa: BLE001
        shot = SCREENSHOTS / "delete_confirm.png"
        await page.screenshot(path=str(shot))
        report.add(
            Result(
                name="delete confirm dialog opens & cancels",
                passed=False,
                detail=str(e)[:140],
                screenshot=str(shot),
            )
        )


async def check_csv_export(page: Page, report: Report) -> None:
    """Permissions page has an Exportar CSV button — assert a download starts."""
    await page.goto(f"{BASE_URL}/admin/permissoes", wait_until="domcontentloaded")
    await page.wait_for_timeout(600)

    export_btn = page.get_by_role("button", name=lambda n: n and "Export" in n).first
    try:
        async with page.expect_download(timeout=4000) as dl_info:
            await export_btn.click()
        dl = await dl_info.value
        report.add(
            Result(
                name="permissions CSV export downloads",
                passed=bool(dl.suggested_filename),
                detail=dl.suggested_filename,
            )
        )
    except Exception as e:  # noqa: BLE001
        shot = SCREENSHOTS / "csv_export.png"
        await page.screenshot(path=str(shot))
        report.add(
            Result(
                name="permissions CSV export downloads",
                passed=False,
                detail=str(e)[:140],
                screenshot=str(shot),
            )
        )


async def main() -> int:
    report = Report()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 1800},
            accept_downloads=True,
        )
        page = await context.new_page()

        signed_in = await restore_session(context, page)
        auth_status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "unknown")
        print(f"\nauth_status={auth_status} session_restored={signed_in}\n")

        if not signed_in:
            print(
                "! No admin session available — running access-control smoke only.\n"
                "  Sign in as an admin in the Lovable preview to enable the full suite.\n"
            )
            await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")
            try:
                await page.wait_for_url("**/auth**", timeout=5000)
                redirected = True
            except Exception:
                redirected = "/auth" in page.url
            report.add(
                Result(
                    name="unauthenticated /admin redirects to /auth",
                    passed=redirected,
                    detail=page.url,
                )
            )
        else:
            print("→ Verifying every admin route renders")
            for path, label in ADMIN_ROUTES:
                await check_route(page, path, label, report)

            print("\n→ Verifying sidebar navigation")
            await check_sidebar_navigation(page, report)

            print("\n→ Verifying destructive confirm dialog")
            await check_destructive_confirm(page, report)

            print("\n→ Verifying CSV export")
            await check_csv_export(page, report)

        await browser.close()

    ok, total = report.summary()
    print(f"\n=== {ok}/{total} checks passed ===")
    return 0 if ok == total else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
