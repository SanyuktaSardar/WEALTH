"use client";

import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTheme } from "next-themes";
import useIsClient from "@/hooks/use-is-client";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-violet-500 font-semibold">
        ₹{payload[0].value.toFixed(2)}
      </p>
    </div>
  );
}

export function MonthlyExpenseChart({ data }) {
  const { resolvedTheme } = useTheme();
  const isClient = useIsClient();

  // Explicit colors per theme — SVG can't resolve CSS custom properties
  const isDark = isClient && resolvedTheme === "dark";
  const axisColor = isDark ? "#94a3b8" : "#64748b";   // slate-400 / slate-500
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";   // slate-800 / slate-200
  const refColor  = isDark ? "#475569" : "#94a3b8";   // slate-600 / slate-400

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-normal">
            Monthly Expenses — Last 12 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No expense data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(`${d.month}-01`), "MMM yy"),
  }));

  const totals = chartData.map((d) => d.total);
  const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
  const maxMonth = chartData.reduce((a, b) => (a.total > b.total ? a : b));
  const latestTotal = chartData[chartData.length - 1]?.total ?? 0;
  const prevTotal  = chartData[chartData.length - 2]?.total ?? 0;
  const trend = latestTotal - prevTotal;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-normal">
            Monthly Expenses — Last 12 Months
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Avg ₹{avg.toFixed(2)} / month · Peak: {maxMonth.label} (₹
            {maxMonth.total.toFixed(2)})
          </p>
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            trend <= 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {trend <= 0 ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          {trend <= 0 ? "↓" : "↑"} ₹{Math.abs(trend).toFixed(2)} vs last month
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridColor}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
                tickFormatter={(v) =>
                  `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                }
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={avg}
                stroke={refColor}
                strokeDasharray="4 4"
                label={{
                  value: "Avg",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: axisColor,
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="url(#expenseGradient)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#7c3aed", strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
