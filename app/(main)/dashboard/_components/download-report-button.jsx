"use client";

import { useState, useMemo } from "react";
import { Download, Loader2, Mail, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { sendReportEmail } from "@/actions/send-email";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Build list of months that have transactions, plus current month
function buildMonthOptions(transactions) {
  const months = new Set();
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  months.add(currentKey);

  (transactions || []).forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.add(key);
  });

  return [...months]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      value: key,
      label: format(parseISO(`${key}-01`), "MMMM yyyy"),
    }));
}

export function DownloadReportButton({
  accounts = [],
  transactions = [],
  monthlyExpenses = [],
  budgetDataList = [],
}) {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const monthOptions = useMemo(() => buildMonthOptions(transactions), [transactions]);

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentKey);

  const selectedLabel =
    monthOptions.find((o) => o.value === selectedMonth)?.label ??
    format(parseISO(`${selectedMonth}-01`), "MMMM yyyy");

  // ── Build HTML report for a given month key ─────────────────────────────
  const buildReportHTML = (monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0);
    const monthLabel = format(parseISO(`${monthKey}-01`), "MMMM yyyy");

    const monthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });

    const totalIncome   = monthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = monthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    const net           = totalIncome - totalExpenses;

    const byCategory = monthTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const recentTx = [...monthTx].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
    const trend = monthlyExpenses.map((m) => ({
      label: format(parseISO(`${m.month}-01`), "MMM yy"),
      total: m.total,
    }));
    const maxTrend = Math.max(...trend.map((x) => x.total), 1);

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
            <div style="background:#7c3aed;border-radius:4px;height:8px;width:${Math.min((m.total / maxTrend) * 100, 100).toFixed(1)}%"></div>
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

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Report — ${monthLabel}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#fff;padding:32px}
    h1{font-size:22px;font-weight:700}
    h2{font-size:14px;font-weight:600;color:#374151;margin:24px 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px}
    .sub{font-size:12px;color:#6b7280;margin-top:4px}
    .stats{display:flex;gap:16px;margin:20px 0}
    .stat{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center}
    .sl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
    .sv{font-size:20px;font-weight:700;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#f3f4f6;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280}
    th:last-child,td:last-child{text-align:right}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
    @media print{body{padding:16px}@page{margin:1cm;size:A4}}
  </style>
</head>
<body>
  <h1>Monthly Financial Report</h1>
  <p class="sub">Period: ${monthLabel} &nbsp;·&nbsp; Generated on ${format(new Date(), "dd MMMM yyyy, HH:mm")}</p>

  <div class="stats">
    <div class="stat"><div class="sl">Income</div><div class="sv" style="color:#22c55e">₹${totalIncome.toFixed(2)}</div></div>
    <div class="stat"><div class="sl">Expenses</div><div class="sv" style="color:#ef4444">₹${totalExpenses.toFixed(2)}</div></div>
    <div class="stat"><div class="sl">Net Savings</div><div class="sv" style="color:${net >= 0 ? "#22c55e" : "#ef4444"}">₹${net.toFixed(2)}</div></div>
    <div class="stat"><div class="sl">Transactions</div><div class="sv">${monthTx.length}</div></div>
  </div>

  <h2>Budget Status by Account</h2>
  <table><thead><tr><th>Account</th><th>Budget</th><th>Spent</th><th>Used</th></tr></thead>
  <tbody>${budgetRows || `<tr><td colspan="4" style="padding:12px;text-align:center;color:#9ca3af">No budgets set</td></tr>`}</tbody></table>

  <h2>Expenses by Category</h2>
  <table><thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead>
  <tbody>${categoryRows}</tbody></table>

  <h2>Transactions (${monthLabel})</h2>
  <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
  <tbody>${txRows}</tbody></table>

  <h2>12-Month Expense Trend</h2>
  <table><thead><tr><th>Month</th><th>Total Expenses</th><th>Relative</th></tr></thead>
  <tbody>${trendRows}</tbody></table>

  <div class="footer">Welth Finance App &nbsp;·&nbsp; Made with ❤️ by Sanyukta Sardar and Taniisha Chakraborty</div>
</body>
</html>`;
  };

  const handleDownload = () => {
    setLoading(true);
    const html = buildReportHTML(selectedMonth);
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
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
        monthKey: selectedMonth,
      });
      if (result?.success) {
        toast.success(`Report for ${selectedLabel} sent to ${result.email}`);
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
      {/* Month selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
            {selectedLabel}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
          {monthOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => setSelectedMonth(opt.value)}
              className={opt.value === selectedMonth ? "font-semibold" : ""}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Download PDF */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading || emailLoading}
        className="gap-2 h-8"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {loading ? "Preparing..." : "Download PDF"}
      </Button>

      {/* Send to email */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSendEmail}
        disabled={loading || emailLoading}
        className="gap-2 h-8"
      >
        {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {emailLoading ? "Sending..." : "Send to Email"}
      </Button>
    </div>
  );
}
