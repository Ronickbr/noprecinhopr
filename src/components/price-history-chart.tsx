import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatBRL } from "@/lib/format";

interface Props {
  data: { day: string; price_cents: number }[];
}

export function PriceHistoryChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
        Sem histórico suficiente ainda.
      </div>
    );
  }
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="day"
            tickFormatter={(d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            stroke="var(--color-border)"
            minTickGap={30}
          />
          <YAxis
            tickFormatter={(v) => `R$ ${(v / 100).toFixed(0)}`}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            stroke="var(--color-border)"
            width={60}
          />
          <Tooltip
            formatter={(v: number) => [formatBRL(v), "Menor preço"]}
            labelFormatter={(d) => new Date(d as string).toLocaleDateString("pt-BR")}
            contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="price_cents"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
