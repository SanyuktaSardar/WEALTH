"use client";

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLORS = [
  "#7c3aed",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#f43f5e",
  "#0ea5e9",
  "#84cc16",
];

// Build period options dynamically from actual transaction dates for the selected account
function buildPeriodOptions(accountTransactions) {
  if (!accountTransactions.length) {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return [
      { value: "all", label: "All Time" },
      { value: currentKey, label: format(now, "MMMM yyyy") },
    ];
  }

  // Find the earliest and latest transaction months
  const months = new Set();
  accountTransactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.add(key);
  });

  // Also always include current month
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  months.add(currentKey);

  // Sort descending (newest first)
  const sorted = [...months].sort((a, b) => b.localeCompare(a));

  return [
    { value: "all", label: "All Time" },
    ...sorted.map((key) => ({
      value: key,
      label: format(parseISO(`${key}-01`), "MMMM yyyy"),
    })),
  ];
}

export function DashboardOverview({ accounts = [], transactions = [] }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?.id || accounts[0]?.id
  );
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  // All transactions for the selected account
  const accountTransactions = useMemo(
    () => transactions.filter((t) => t.accountId === selectedAccountId),
    [transactions, selectedAccountId]
  );

  // Build period options from actual transaction dates
  const periodOptions = useMemo(
    () => buildPeriodOptions(accountTransactions),
    [accountTransactions]
  );

  // Resolve "current" to the actual current month key
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const resolvedPeriod = selectedPeriod === "current" ? currentMonthKey : selectedPeriod;

  // When account changes, reset to current month
  const handleAccountChange = (id) => {
    setSelectedAccountId(id);
    setSelectedPeriod("current");
  };

  // Recent 5 transactions (always latest regardless of period filter)
  const recentTransactions = useMemo(
    () =>
      [...accountTransactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5),
    [accountTransactions]
  );

  // Filter expenses for the pie chart based on selected period
  const filteredExpenses = useMemo(() => {
    return accountTransactions.filter((t) => {
      if (t.type !== "EXPENSE") return false;
      if (resolvedPeriod === "all") return true;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === resolvedPeriod;
    });
  }, [accountTransactions, resolvedPeriod]);

  // Aggregate by category
  const pieChartData = useMemo(() => {
    const byCategory = filteredExpenses.reduce((acc, t) => {
      const amount = typeof t.amount === "number" ? t.amount : parseFloat(t.amount) || 0;
      acc[t.category] = (acc[t.category] || 0) + amount;
      return acc;
    }, {});
    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const totalExpenses = pieChartData.reduce((s, d) => s + d.value, 0);

  const selectedPeriodLabel =
    periodOptions.find((o) => o.value === resolvedPeriod)?.label ?? "All Time";

  if (!accounts.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Create an account to see transactions and expense breakdown.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ── Recent Transactions ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Transactions
          </CardTitle>
          <Select value={selectedAccountId} onValueChange={handleAccountChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-1">
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No recent transactions
              </p>
            ) : (
              recentTransactions.map((transaction) => {
                const amount =
                  typeof transaction.amount === "number"
                    ? transaction.amount
                    : parseFloat(transaction.amount) || 0;
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          transaction.type === "EXPENSE"
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-emerald-100 dark:bg-emerald-900/30"
                        )}
                      >
                        {transaction.type === "EXPENSE" ? (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight text-foreground">
                          {transaction.description || "Untitled Transaction"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(transaction.date), "MMM d, yyyy")}
                          {" · "}
                          <span className="capitalize">{transaction.category}</span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        transaction.type === "EXPENSE"
                          ? "text-red-500"
                          : "text-emerald-500"
                      )}
                    >
                      {transaction.type === "EXPENSE" ? "−" : "+"}₹
                      {amount.toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Expense Breakdown Pie Chart ──────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Expense Breakdown
            </CardTitle>
            {totalExpenses > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Total: ₹{totalExpenses.toFixed(2)} · {selectedPeriodLabel}
              </p>
            )}
          </div>

          {/* Period filter dropdown */}
          <Select value={resolvedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {periodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent>
          {pieChartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No expenses for{" "}
              <span className="font-medium">{selectedPeriodLabel}</span>
            </p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `₹${Number(value).toFixed(2)} (${totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0}%)`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
