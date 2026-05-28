"use client";

import { useState } from "react";
import { Download, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { sendReportEmail } from "@/actions/send-email";
import { toast } from "sonner";

/**
 * Props:
 *  accounts        – array of account objects
 *  transactions    – all serialized transactions
 *  monthlyExpenses – [{ month: "YYYY-MM", total: number }]
 *  budgetDataList  – [{ accountName, budget, currentExpenses }]
 */
export function DownloadReportButton({
  accounts = [],
  transactions = [],
  monthlyExpenses = [],
  budgetDataList = [],
}) {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);

    // ── Compute summary data ────────────────────────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

    const thisMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });

    const totalIncome   = thisMonthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = thisMonthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    const net           = totalIncome - totalExpenses;

    // Category breakdown
    const byCategory = thisMonthTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    // Recent transactions (last 20 of this month)
    const recentTx = [...thisMonthTx]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);

    // 12-month trend
    const trend = monthlyExpenses.map((m) => ({
      label: format(parseISO(`${m.month}-01`), "MMM yy"),
      total: m.total,
    }));

    // ── Build HTML ──────────────────────────────────────────────────────────
    const categoryRows = sortedCategories.length
      ? sortedCategories.map(([cat, amt]) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${cat}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">₹${amt.toFixed(2)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280">
              ${totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : 0}%
            </td>
          </tr>`).join("")
      : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#9ca3af">No expenses this month</td></tr>`;

    const txRows = recentTx.length
      ? recentTx.map((t) => `
          <tr>
            <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:12px">${format(new Date(t.date), "dd MMM")}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:12px">${t.description || "—"}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:12px;text-transform:capitalize">${t.category}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:12px;text-align:right;color:${t.type === "EXPENSE" ? "#ef4444" : "#22c55e"}">
              ${t.type === "EXPENSE" ? "−" : "+"}₹${t.amount.toFixed(2)}
            </td>
          </tr>`).join("")
      : `<tr><td colspan="4" style="padding:12px;text-align:center;color:#9ca3af">No transactions this month</td></tr>`;

    const trendRows = trend.map((m) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:12px">${m.label}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:12px;text-align:right">₹${m.total.toFixed(2)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:12px">
          <div style="background:#e5e7eb;border-radius:4px;height:8px;width:100%;max-width:120px">
            <div style="background:#7c3aed;border-radius:4px;height:8px;width:${
              Math.max(...trend.map((x) => x.total)) > 0
                ? Math.min((m.total / Math.max(...trend.map((x) => x.total))) * 100, 100).toFixed(1)
                : 0
            }%"></div>
          </div>
        </td>
      </tr>`).join("");

    const budgetRows = budgetDataList.map((b) => {
      const pct = b.budget ? Math.min((b.currentExpenses / b.budget.amount) * 100, 100) : 0;
      const color = pct >= 90 ? "#ef4444" : pct >= 75 ? "#eab308" : "#22c55e";
      return `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${b.accountName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${b.budget ? `₹${b.budget.amount.toFixed(2)}` : "—"}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">₹${b.currentExpenses.toFixed(2)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:${color}">${b.budget ? `${pct.toFixed(1)}%` : "—"}</td>
        </tr>`;
    }).join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Monthly Report — ${monthLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; }
    h2 { font-size: 14px; font-weight: 600; color: #374151; margin: 24px 0 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
    .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .stats { display: flex; gap: 16px; margin: 20px 0; }
    .stat { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
    .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
    .income { color: #22c55e; }
    .expense { color: #ef4444; }
    .net-pos { color: #22c55e; }
    .net-neg { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    th:last-child, td:last-child { text-align: right; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 16px; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>
  <h1>Monthly Financial Report</h1>
  <p class="subtitle">Generated on ${format(now, "dd MMMM yyyy, HH:mm")} &nbsp;·&nbsp; Period: ${monthLabel}</p>

  <div class="stats">
    <div class="stat">
      <div class="stat-label">Total Income</div>
      <div class="stat-value income">₹${totalIncome.toFixed(2)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Expenses</div>
      <div class="stat-value expense">₹${totalExpenses.toFixed(2)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Net Savings</div>
      <div class="stat-value ${net >= 0 ? "net-pos" : "net-neg"}">₹${net.toFixed(2)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Transactions</div>
      <div class="stat-value">${thisMonthTx.length}</div>
    </div>
  </div>

  <h2>Budget Status by Account</h2>
  <table>
    <thead><tr><th>Account</th><th>Budget</th><th>Spent</th><th>Used</th></tr></thead>
    <tbody>${budgetRows || `<tr><td colspan="4" style="padding:12px;text-align:center;color:#9ca3af">No budgets set</td></tr>`}</tbody>
  </table>

  <h2>Expenses by Category</h2>
  <table>
    <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>

  <h2>Recent Transactions (This Month)</h2>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
    <tbody>${txRows}</tbody>
  </table>

  <h2>12-Month Expense Trend</h2>
  <table>
    <thead><tr><th>Month</th><th>Total Expenses</th><th>Relative</th></tr></thead>
    <tbody>${trendRows}</tbody>
  </table>

  <div class="footer">
    Welth Finance App &nbsp;·&nbsp; Made with ❤️ by Sanyukta Sardar and Taniisha Chakraborty
  </div>
</body>
</html>`;

    // ── Open print dialog ───────────────────────────────────────────────────
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Give the browser a moment to render before triggering print
    setTimeout(() => {
      printWindow.print();
      setLoading(false);
    }, 400);
  };

  const handleSendEmail = async () => {
    setEmailLoading(true);
    try {
      const result = await sendReportEmail({
        transactions,
        monthlyExpenses,
        budgetDataList,
      });
      if (result?.success) {
        toast.success(`Report sent to ${result.email}`);
      } else {
        toast.error(result?.error || "Failed to send email");
      }
    } catch (err) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading || emailLoading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {loading ? "Preparing..." : "Download PDF"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSendEmail}
        disabled={loading || emailLoading}
        className="gap-2"
      >
        {emailLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {emailLoading ? "Sending..." : "Send to Email"}
      </Button>
    </div>
  );
}
