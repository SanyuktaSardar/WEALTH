"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";
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
];

export function DashboardOverview({ accounts, transactions }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?.id || accounts[0]?.id
  );

  const accountTransactions = transactions.filter(
    (t) => t.accountId === selectedAccountId
  );

  const recentTransactions = [...accountTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const currentDate = new Date();
  const currentMonthExpenses = accountTransactions.filter((t) => {
    const d = new Date(t.date);
    return (
      t.type === "EXPENSE" &&
      d.getMonth() === currentDate.getMonth() &&
      d.getFullYear() === currentDate.getFullYear()
    );
  });

  const expensesByCategory = currentMonthExpenses.reduce((acc, t) => {
    const amount = typeof t.amount === "number" ? t.amount : parseFloat(t.amount) || 0;
    acc[t.category] = (acc[t.category] || 0) + amount;
    return acc;
  }, {});

  const pieChartData = Object.entries(expensesByCategory).map(
    ([category, amount]) => ({ name: category, value: amount })
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Transactions
          </CardTitle>
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
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
                          <span className="capitalize">
                            {transaction.category}
                          </span>
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

      {/* Expense Breakdown Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-normal">
            Monthly Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pieChartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No expenses this month
            </p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) =>
                      `${name}: ₹${Number(value).toFixed(2)}`
                    }
                  >
                    {pieChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, undefined]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span
                        style={{
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                      >
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
