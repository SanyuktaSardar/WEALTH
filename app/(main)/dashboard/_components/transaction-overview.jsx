"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#16a34a", "#1e40af", "#d97706", "#dc2626", "#7c3aed",
  "#0891b2", "#be185d", "#65a30d", "#ea580c", "#6366f1",
];

export default function DashboardOverview({ accounts, transactions }) {
  const { resolvedTheme } = useTheme();
  const lineColor = resolvedTheme === "dark" ? "#38bdf8" : "#1e40af";
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance),
    0
  );

  const currentMonth = new Date();
  const monthStart = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );

  const monthlyIncome = transactions
    .filter((t) => t.type === "INCOME" && new Date(t.date) >= monthStart)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const currentMonthExpenses = transactions
    .filter((t) => t.type === "EXPENSE" && new Date(t.date) >= monthStart)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  // Line chart — last 12 months expenses trend
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthlyExpenses = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 11 + i, 1);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const total = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return (
          t.type === "EXPENSE" &&
          d.getFullYear() === year &&
          d.getMonth() === monthIndex
        );
      })
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    return {
      month: `${MONTHS[monthIndex]} ${year !== currentMonth.getFullYear() ? year : ""}`.trim(),
      amount: parseFloat(total.toFixed(2)),
    };
  });
  const expenseByCategory = transactions
    .filter((t) => t.type === "EXPENSE" && new Date(t.date) >= monthStart)
    .reduce((acc, t) => {
      const cat = t.category || "other";
      acc[cat] = (acc[cat] || 0) + parseFloat(t.amount);
      return acc;
    }, {});

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: parseFloat(value.toFixed(2)),
  }));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Balance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">₹{totalBalance.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Monthly Income */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">
            ₹{monthlyIncome.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">This month</p>
        </CardContent>
      </Card>

      {/* Monthly Expenses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-500">
            ₹{currentMonthExpenses.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">This month</p>
        </CardContent>
      </Card>

      {/* Line Chart — Monthly Expenses This Year */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">
            Monthly Expenses — Last 12 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyExpenses}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  formatter={(value) => [`₹${value}`, "Expenses"]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke={lineColor}
                  strokeWidth={2.5}
                  dot={{ fill: lineColor, r: 4 }}
                  activeDot={{ r: 6, fill: lineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart — Expense Breakdown */}
      {pieData.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`₹${value}`, undefined]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <Card className={pieData.length > 0 ? "md:col-span-1" : "md:col-span-3"}>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-1.5 rounded-full",
                        t.type === "INCOME"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-500"
                      )}
                    >
                      {t.type === "INCOME" ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[120px]">
                        {t.description || t.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date), "MMM d")}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold shrink-0",
                      t.type === "INCOME" ? "text-green-600" : "text-red-500"
                    )}
                  >
                    {t.type === "INCOME" ? "+" : "-"}₹
                    {parseFloat(t.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
