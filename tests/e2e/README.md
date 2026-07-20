# Admin E2E Tests

Playwright-based smoke suite that exercises every button, link and destructive
action of the admin panel.

## Run

```bash
python3 tests/e2e/admin_e2e.py
```

The script talks to `http://localhost:8080` by default (override with
`E2E_BASE_URL`). Screenshots land in `tests/e2e/screenshots/`.

## Authentication

The full suite needs an admin session. In the Lovable sandbox this happens
automatically as soon as an admin has signed in through the preview once —
the harness injects the session into these env vars on every subsequent
run:

- `LOVABLE_BROWSER_AUTH_STATUS=injected`
- `LOVABLE_BROWSER_SUPABASE_SESSION_JSON`
- `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY`
- `LOVABLE_BROWSER_SUPABASE_COOKIES_JSON`

When no session is available (`AUTH_STATUS=signed_out`) the script degrades
to a single check: that `/admin` correctly redirects to `/auth`.

## What it verifies

1. Every route listed in `ADMIN_ROUTES` renders without console errors.
2. Every sidebar link navigates to the expected URL.
3. Destructive actions (e.g. delete a category) open the themed confirm
   dialog and can be cancelled — no real data is mutated.
4. CSV export on the Permissions page produces a real download.

Keep `ADMIN_ROUTES` in sync with `src/components/admin/admin-shell.tsx` when
the sidebar changes.
