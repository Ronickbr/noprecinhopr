import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

// ============ FINANCIAL DASHBOARD ============
export type FinanceAlert = {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
  metric?: string;
  category: "churn" | "revenue" | "billing" | "conversion" | "growth" | "system";
  threshold?: string;
  current?: string;
  context: string;
  impact: string;
  recommendations: string[];
  related_metrics: Array<{ label: string; value: string }>;
  severity_score: number; // 0-100
};
export type FinanceSummary = {
  mrr_cents: number;
  arr_cents: number;
  active_subs: number;
  trial_subs: number;
  canceled_last_30d: number;
  churn_rate: number;
  by_plan: Array<{ plan_id: string; plan_name: string; price_cents: number; active: number; mrr_cents: number }>;
  mrr_trend: Array<{ month: string; mrr_cents: number; new_subs: number; churned: number }>;
  upcoming_renewals: Array<{ id: string; user_name: string; plan_name: string; price_cents: number; renew_at: string }>;
  alerts: FinanceAlert[];
  renewals_7d_count: number;
  renewals_7d_cents: number;
  trials_expiring_7d: number;
  overdue_count: number;
  mrr_delta_pct: number;
};

export const adminFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FinanceSummary> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const { data: plans } = await db.from("merchant_plans").select("id, name, price_cents");
    const planMap = new Map<string, { name: string; price_cents: number }>(
      ((plans ?? []) as Array<{ id: string; name: string; price_cents: number }>).map((p) => [p.id, { name: p.name, price_cents: p.price_cents }]),
    );

    const { data: subs } = await db
      .from("merchant_subscriptions")
      .select("id, user_id, plan_id, status, trial_ends_at, current_period_end, canceled_at, created_at");

    const now = Date.now();
    const d30 = now - 30 * 86400_000;
    let mrr = 0;
    let active = 0;
    let trial = 0;
    let canceled30 = 0;
    const byPlan = new Map<string, { active: number; mrr: number }>();

    const list = (subs ?? []) as Array<{ id: string; user_id: string; plan_id: string; status: string; trial_ends_at: string | null; current_period_end: string | null; canceled_at: string | null; created_at: string }>;
    for (const s of list) {
      const price = planMap.get(s.plan_id)?.price_cents ?? 0;
      if (s.status === "active") {
        active++;
        mrr += price;
        const cur = byPlan.get(s.plan_id) ?? { active: 0, mrr: 0 };
        cur.active++; cur.mrr += price;
        byPlan.set(s.plan_id, cur);
      } else if (s.status === "trialing") {
        trial++;
      }
      if (s.canceled_at && new Date(s.canceled_at).getTime() >= d30) canceled30++;
    }
    const churn = active + canceled30 > 0 ? (canceled30 / (active + canceled30)) * 100 : 0;

    // MRR trend last 6 months (approximation: count active-at-time subs)
    const trend: Array<{ month: string; mrr_cents: number; new_subs: number; churned: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      let mMrr = 0, mNew = 0, mChurn = 0;
      for (const s of list) {
        const created = new Date(s.created_at).getTime();
        const canceled = s.canceled_at ? new Date(s.canceled_at).getTime() : null;
        const activeInMonth = created < monthEnd && (canceled === null || canceled >= monthStart) && s.status !== "trialing";
        if (activeInMonth) mMrr += planMap.get(s.plan_id)?.price_cents ?? 0;
        if (created >= monthStart && created < monthEnd) mNew++;
        if (canceled && canceled >= monthStart && canceled < monthEnd) mChurn++;
      }
      trend.push({ month: monthKey, mrr_cents: mMrr, new_subs: mNew, churned: mChurn });
    }

    // upcoming renewals next 30 days
    const upcomingRaw = list
      .filter((s) => s.status === "active" && s.current_period_end && new Date(s.current_period_end).getTime() < now + 30 * 86400_000)
      .sort((a, b) => new Date(a.current_period_end!).getTime() - new Date(b.current_period_end!).getTime())
      .slice(0, 20);

    const userIds = Array.from(new Set(upcomingRaw.map((s) => s.user_id)));
    let nameMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await db.from("profiles").select("id, display_name").in("id", userIds);
      nameMap = new Map(((profs ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name ?? p.id.slice(0, 8)]));
    }

    // Alerts + extra KPIs
    const in7 = now + 7 * 86400_000;
    let renewals7Count = 0;
    let renewals7Cents = 0;
    let trialsExpiring7 = 0;
    let overdueCount = 0;
    for (const s of list) {
      if (s.status === "active" && s.current_period_end) {
        const t = new Date(s.current_period_end).getTime();
        if (t >= now && t <= in7) { renewals7Count++; renewals7Cents += planMap.get(s.plan_id)?.price_cents ?? 0; }
        if (t < now) overdueCount++;
      }
      if (s.status === "trialing" && s.trial_ends_at) {
        const t = new Date(s.trial_ends_at).getTime();
        if (t >= now && t <= in7) trialsExpiring7++;
      }
      if (s.status === "past_due") overdueCount++;
    }
    const prevMrr = trend.length >= 2 ? trend[trend.length - 2].mrr_cents : 0;
    const curMrr = trend.length ? trend[trend.length - 1].mrr_cents : 0;
    const mrrDeltaPct = prevMrr > 0 ? Math.round(((curMrr - prevMrr) / prevMrr) * 10000) / 100 : 0;

    const totalBase = active + canceled30;
    const alerts: FinanceAlert[] = [];
    if (churn > 5) alerts.push({
      id: "churn-high", level: "critical", category: "churn",
      title: "Churn acima do limite crítico",
      message: `Taxa de cancelamento de ${churn.toFixed(2)}% nos últimos 30 dias.`,
      metric: `${churn.toFixed(1)}%`,
      threshold: "≤ 5% ao mês (limite crítico)",
      current: `${churn.toFixed(2)}% (${canceled30} de ${totalBase})`,
      context: `Nos últimos 30 dias, ${canceled30} assinatura(s) foram canceladas contra ${active} ativa(s). Um churn acima de 5% indica perda estrutural da base e compromete o crescimento líquido do MRR.`,
      impact: `Se mantido, projeta perda anual de ~${Math.round(churn * 12)}% da base atual — equivalente a ${(mrr / 100).toFixed(2)} BRL de MRR em risco nos próximos 12 meses.`,
      recommendations: [
        "Abrir pesquisa de cancelamento (motivo + NPS) para os últimos 30 dias",
        "Contatar 1-a-1 os lojistas cancelados nas últimas 2 semanas (win-back)",
        "Revisar preços do plano com maior churn e testar oferta de retenção",
        "Auditar erros/bugs recentes no painel do lojista que possam ter gerado fricção",
      ],
      related_metrics: [
        { label: "Cancelados 30d", value: String(canceled30) },
        { label: "Base ativa", value: String(active) },
        { label: "MRR em risco (anual)", value: `${((mrr * churn * 12) / 10000).toFixed(2)} BRL` },
      ],
      severity_score: Math.min(100, 60 + Math.round(churn * 4)),
    });
    else if (churn > 3) alerts.push({
      id: "churn-warn", level: "warning", category: "churn",
      title: "Churn em zona de alerta",
      message: `Churn de ${churn.toFixed(2)}% — monitorar retenção.`,
      metric: `${churn.toFixed(1)}%`,
      threshold: "3% a 5% ao mês (alerta)",
      current: `${churn.toFixed(2)}%`,
      context: `O churn subiu acima da faixa saudável (< 3%) mas ainda não atingiu o nível crítico. É o momento ideal de agir antes que se torne estrutural.`,
      impact: `Projeção anualizada de ${(churn * 12).toFixed(0)}% de perda de base — pressão sobre CAC/LTV.`,
      recommendations: [
        "Segmentar cancelamentos por plano e por tempo de casa",
        "Iniciar campanha de reengajamento para lojistas com < 30 dias",
        "Revisar onboarding e primeiros 7 dias de uso",
      ],
      related_metrics: [
        { label: "Cancelados 30d", value: String(canceled30) },
        { label: "Base ativa", value: String(active) },
      ],
      severity_score: 40 + Math.round(churn * 4),
    });
    if (mrrDeltaPct < -5) alerts.push({
      id: "mrr-drop", level: "critical", category: "revenue",
      title: "Queda expressiva de MRR",
      message: `MRR caiu ${Math.abs(mrrDeltaPct)}% em relação ao mês anterior.`,
      metric: `${mrrDeltaPct}%`,
      threshold: "≥ -5% mês a mês",
      current: `${mrrDeltaPct}% (${(curMrr / 100).toFixed(2)} vs ${(prevMrr / 100).toFixed(2)} BRL)`,
      context: `O MRR do mês corrente está ${Math.abs(mrrDeltaPct)}% abaixo do mês anterior. Combinado com o histórico de trend (6 meses), indica reversão de crescimento.`,
      impact: `Perda mensal estimada de ${((prevMrr - curMrr) / 100).toFixed(2)} BRL — ${(((prevMrr - curMrr) * 12) / 100).toFixed(2)} BRL/ano se sustentado.`,
      recommendations: [
        "Comparar cancelamentos vs downgrades vs novas assinaturas do mês",
        "Verificar falhas de cobrança (past_due) e recuperação de pagamentos",
        "Reforçar aquisição via campanhas de novos lojistas",
      ],
      related_metrics: [
        { label: "MRR atual", value: `${(curMrr / 100).toFixed(2)} BRL` },
        { label: "MRR mês anterior", value: `${(prevMrr / 100).toFixed(2)} BRL` },
        { label: "Variação", value: `${mrrDeltaPct}%` },
      ],
      severity_score: Math.min(100, 65 + Math.abs(mrrDeltaPct)),
    });
    else if (mrrDeltaPct < 0) alerts.push({
      id: "mrr-slip", level: "warning", category: "revenue",
      title: "MRR em leve queda",
      message: `Variação de ${mrrDeltaPct}% no mês.`,
      metric: `${mrrDeltaPct}%`,
      threshold: "Manter ≥ 0% mês a mês",
      current: `${mrrDeltaPct}%`,
      context: `Ligeira contração da receita recorrente. Ainda dentro da faixa recuperável, mas requer atenção antes do fechamento do mês.`,
      impact: `Sinal precoce de estagnação — monitorar próximas 2 semanas.`,
      recommendations: [
        "Ativar upsell nos planos Starter → Pro",
        "Ofertar plano anual com desconto para retenção",
      ],
      related_metrics: [
        { label: "MRR atual", value: `${(curMrr / 100).toFixed(2)} BRL` },
        { label: "MRR anterior", value: `${(prevMrr / 100).toFixed(2)} BRL` },
      ],
      severity_score: 30 + Math.abs(mrrDeltaPct) * 2,
    });
    if (overdueCount > 0) alerts.push({
      id: "overdue", level: "critical", category: "billing",
      title: "Assinaturas vencidas ou em atraso",
      message: `${overdueCount} assinatura(s) com pagamento pendente ou vencido.`,
      metric: String(overdueCount),
      threshold: "0 vencidas",
      current: `${overdueCount} assinatura(s)`,
      context: `Assinaturas com current_period_end no passado ou status past_due permanecem consumindo recursos sem receita reconhecida.`,
      impact: `MRR reportado pode estar inflado. Risco de churn involuntário se cobrança não for regularizada em até 7 dias.`,
      recommendations: [
        "Disparar notificação por e-mail para atualizar meio de pagamento",
        "Retentar cobrança automática (dunning) em D+1, D+3, D+7",
        "Suspender acesso após 10 dias de vencido para forçar regularização",
      ],
      related_metrics: [
        { label: "Vencidas", value: String(overdueCount) },
        { label: "% da base ativa", value: active > 0 ? `${((overdueCount / active) * 100).toFixed(1)}%` : "—" },
      ],
      severity_score: Math.min(100, 55 + overdueCount * 5),
    });
    if (renewals7Count >= 5) alerts.push({
      id: "renew-7", level: "info", category: "billing",
      title: "Renovações concentradas nos próximos 7 dias",
      message: `${renewals7Count} renovações nos próximos 7 dias (${(renewals7Cents / 100).toFixed(2)} BRL).`,
      metric: String(renewals7Count),
      threshold: "Informativo (planejamento de caixa)",
      current: `${renewals7Count} renovações / ${(renewals7Cents / 100).toFixed(2)} BRL`,
      context: `Volume relevante de renovações agendadas — importante garantir infraestrutura de cobrança e comunicação prévia aos lojistas.`,
      impact: `Falha de processamento pode gerar pico artificial de churn involuntário.`,
      recommendations: [
        "Confirmar saúde do gateway de pagamento",
        "Enviar lembrete 3 dias antes da renovação",
      ],
      related_metrics: [
        { label: "Qtd. renovações", value: String(renewals7Count) },
        { label: "Valor total", value: `${(renewals7Cents / 100).toFixed(2)} BRL` },
        { label: "Ticket médio", value: renewals7Count > 0 ? `${(renewals7Cents / renewals7Count / 100).toFixed(2)} BRL` : "—" },
      ],
      severity_score: 20,
    });
    if (trialsExpiring7 > 0) alerts.push({
      id: "trials-7", level: "warning", category: "conversion",
      title: "Trials expirando em até 7 dias",
      message: `${trialsExpiring7} trial(s) terminam em até 7 dias — oportunidade de conversão.`,
      metric: String(trialsExpiring7),
      threshold: "Converter ≥ 30% dos trials",
      current: `${trialsExpiring7} trial(s) na janela`,
      context: `Janela crítica de conversão: lojistas em trial que não forem contatados até o fim do período tendem a evadir silenciosamente.`,
      impact: `Cada trial não convertido representa CAC perdido. Potencial de +${(trialsExpiring7 * 0.3).toFixed(0)} novos assinantes se hit a meta de 30%.`,
      recommendations: [
        "Enviar e-mail personalizado 3 dias antes do fim do trial",
        "Ofertar desconto de primeiro mês para acelerar decisão",
        "Ligar/WhatsApp para trials com uso alto do painel",
      ],
      related_metrics: [
        { label: "Trials expirando", value: String(trialsExpiring7) },
        { label: "Total em trial", value: String(trial) },
      ],
      severity_score: 45 + trialsExpiring7 * 3,
    });
    if (active === 0) alerts.push({
      id: "no-active", level: "warning", category: "growth",
      title: "Sem assinantes ativos",
      message: "Nenhuma assinatura ativa no momento.",
      metric: "0",
      threshold: "≥ 1 assinatura ativa",
      current: "0 ativas",
      context: `Plataforma sem receita recorrente. Fase de aquisição inicial ou perda total de base.`,
      impact: `MRR = 0. Necessário focar em aquisição imediata para viabilizar operação.`,
      recommendations: [
        "Executar campanha de aquisição direcionada",
        "Revisar landing e proposta de valor dos planos",
        "Ativar rede de indicação e parcerias",
      ],
      related_metrics: [
        { label: "Ativos", value: "0" },
        { label: "Em trial", value: String(trial) },
      ],
      severity_score: 70,
    });
    if (!alerts.length) alerts.push({
      id: "ok", level: "info", category: "system",
      title: "Tudo estável",
      message: "Nenhum alerta financeiro no momento.",
      metric: "OK",
      context: `Todos os indicadores monitorados (churn, MRR, cobrança, trials e renovações) estão dentro dos limiares saudáveis.`,
      impact: `Operação financeira em regime normal — foco pode ir para crescimento.`,
      recommendations: [
        "Aproveitar estabilidade para investir em aquisição",
        "Rodar experimentos de upsell com risco controlado",
      ],
      related_metrics: [
        { label: "MRR", value: `${(mrr / 100).toFixed(2)} BRL` },
        { label: "Ativos", value: String(active) },
        { label: "Churn", value: `${churn.toFixed(2)}%` },
      ],
      severity_score: 5,
    });

    return {
      mrr_cents: mrr,
      arr_cents: mrr * 12,
      active_subs: active,
      trial_subs: trial,
      canceled_last_30d: canceled30,
      churn_rate: Math.round(churn * 100) / 100,
      by_plan: Array.from(byPlan.entries()).map(([id, v]) => ({
        plan_id: id,
        plan_name: planMap.get(id)?.name ?? "—",
        price_cents: planMap.get(id)?.price_cents ?? 0,
        active: v.active,
        mrr_cents: v.mrr,
      })).sort((a, b) => b.mrr_cents - a.mrr_cents),
      mrr_trend: trend,
      upcoming_renewals: upcomingRaw.map((s) => ({
        id: s.id,
        user_name: nameMap.get(s.user_id) ?? s.user_id.slice(0, 8),
        plan_name: planMap.get(s.plan_id)?.name ?? "—",
        price_cents: planMap.get(s.plan_id)?.price_cents ?? 0,
        renew_at: s.current_period_end!,
      })),
      alerts,
      renewals_7d_count: renewals7Count,
      renewals_7d_cents: renewals7Cents,
      trials_expiring_7d: trialsExpiring7,
      overdue_count: overdueCount,
      mrr_delta_pct: mrrDeltaPct,
    };
  });

// ============ REGIONS (Paraná) ============
export type PRCityRow = { city: string; stores: number; products: number; clicks_30d: number; share_stores: number };
export type PRDrilldown = {
  total_stores: number;
  cities: number;
  total_products: number;
  total_clicks_30d: number;
  top_cities: PRCityRow[];
  regions: Array<{ region: string; stores: number; products: number; clicks_30d: number }>;
  concentration_top3_pct: number;
};
export type RegionSummary = {
  total_stores: number;
  cities_covered: number;
  by_state: Array<{ state: string; count: number }>;
  by_city: Array<{ city: string; state: string; stores: number; products: number; clicks_30d: number }>;
  uncategorized: number;
  pr_drilldown: PRDrilldown;
};

// Meso-regions of Paraná (simplified grouping of principal cities)
const PR_REGIONS: Record<string, string[]> = {
  "RMC (Curitiba)": ["curitiba", "sao jose dos pinhais", "são josé dos pinhais", "colombo", "araucaria", "araucária", "pinhais", "campo largo", "fazenda rio grande", "piraquara"],
  "Norte (Londrina)": ["londrina", "cambe", "cambé", "rolandia", "rolândia", "arapongas", "apucarana", "ibipora", "ibiporã"],
  "Noroeste (Maringá)": ["maringa", "maringá", "sarandi", "paicandu", "paiçandu", "cianorte", "umuarama", "paranavai", "paranavaí"],
  "Oeste (Cascavel/Foz)": ["cascavel", "foz do iguacu", "foz do iguaçu", "toledo", "marechal candido rondon", "marechal cândido rondon", "medianeira"],
  "Sudoeste (Pato Branco)": ["pato branco", "francisco beltrao", "francisco beltrão", "dois vizinhos"],
  "Campos Gerais (Ponta Grossa)": ["ponta grossa", "castro", "telemaco borba", "telêmaco borba", "irati"],
  "Litoral": ["paranagua", "paranaguá", "matinhos", "guaratuba", "pontal do parana", "pontal do paraná"],
};
function classifyPRRegion(city: string): string {
  const c = city.trim().toLowerCase();
  for (const [region, cities] of Object.entries(PR_REGIONS)) {
    if (cities.includes(c)) return region;
  }
  return "Interior";
}

export const adminRegionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegionSummary> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const { data: stores } = await db.from("stores").select("id, city, state, status");
    const s = (stores ?? []) as Array<{ id: string; city: string | null; state: string | null; status: string }>;
    const byState = new Map<string, number>();
    const byCity = new Map<string, { city: string; state: string; stores: number }>();
    let uncat = 0;
    for (const st of s) {
      const state = st.state ?? "—";
      byState.set(state, (byState.get(state) ?? 0) + 1);
      if (!st.city) { uncat++; continue; }
      const key = `${state}::${st.city}`;
      const cur = byCity.get(key) ?? { city: st.city, state, stores: 0 };
      cur.stores++;
      byCity.set(key, cur);
    }

    const { data: offers } = await db.from("offers").select("store_id");
    const offerCount = new Map<string, number>();
    for (const o of ((offers ?? []) as Array<{ store_id: string }>)) {
      offerCount.set(o.store_id, (offerCount.get(o.store_id) ?? 0) + 1);
    }
    const storeCityMap = new Map<string, string>();
    for (const st of s) if (st.city) storeCityMap.set(st.id, `${st.state ?? "—"}::${st.city}`);

    const cityProducts = new Map<string, number>();
    for (const [storeId, cnt] of offerCount) {
      const key = storeCityMap.get(storeId);
      if (key) cityProducts.set(key, (cityProducts.get(key) ?? 0) + cnt);
    }

    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: clicks } = await db.from("clicks").select("offer_id, created_at").gte("created_at", d30);
    const { data: offers2 } = await db.from("offers").select("id, store_id");
    const offerStore = new Map<string, string>(((offers2 ?? []) as Array<{ id: string; store_id: string }>).map((o) => [o.id, o.store_id]));
    const cityClicks = new Map<string, number>();
    for (const c of ((clicks ?? []) as Array<{ offer_id: string }>)) {
      const sid = offerStore.get(c.offer_id);
      if (!sid) continue;
      const key = storeCityMap.get(sid);
      if (key) cityClicks.set(key, (cityClicks.get(key) ?? 0) + 1);
    }

    const byCityArr = Array.from(byCity.values()).map((c) => ({
      ...c,
      products: cityProducts.get(`${c.state}::${c.city}`) ?? 0,
      clicks_30d: cityClicks.get(`${c.state}::${c.city}`) ?? 0,
    })).sort((a, b) => b.stores - a.stores);

    // Paraná drill-down
    const prCities = byCityArr.filter((c) => c.state === "PR");
    const prTotalStores = prCities.reduce((a, c) => a + c.stores, 0);
    const prTotalProducts = prCities.reduce((a, c) => a + c.products, 0);
    const prTotalClicks = prCities.reduce((a, c) => a + c.clicks_30d, 0);
    const topCities: PRCityRow[] = prCities.slice(0, 15).map((c) => ({
      city: c.city, stores: c.stores, products: c.products, clicks_30d: c.clicks_30d,
      share_stores: prTotalStores > 0 ? Math.round((c.stores / prTotalStores) * 10000) / 100 : 0,
    }));
    const top3 = prCities.slice(0, 3).reduce((a, c) => a + c.stores, 0);
    const concentration = prTotalStores > 0 ? Math.round((top3 / prTotalStores) * 10000) / 100 : 0;

    const regionMap = new Map<string, { stores: number; products: number; clicks_30d: number }>();
    for (const c of prCities) {
      const key = classifyPRRegion(c.city);
      const cur = regionMap.get(key) ?? { stores: 0, products: 0, clicks_30d: 0 };
      cur.stores += c.stores; cur.products += c.products; cur.clicks_30d += c.clicks_30d;
      regionMap.set(key, cur);
    }
    const regions = Array.from(regionMap.entries())
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.stores - a.stores);

    return {
      total_stores: s.length,
      cities_covered: byCity.size,
      by_state: Array.from(byState.entries()).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count),
      by_city: byCityArr,
      uncategorized: uncat,
      pr_drilldown: {
        total_stores: prTotalStores,
        cities: prCities.length,
        total_products: prTotalProducts,
        total_clicks_30d: prTotalClicks,
        top_cities: topCities,
        regions,
        concentration_top3_pct: concentration,
      },
    };
  });

export const adminUpdateStoreLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      store_id: z.string().uuid(),
      city: z.string().min(1).max(120),
      state: z.string().min(2).max(2),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("stores").update({ city: data.city, state: data.state.toUpperCase() }).eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
