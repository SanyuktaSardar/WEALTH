"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { format } from "date-fns";
import { deliverEmail } from "@/lib/mail-transport";

async function resolveHtmlBody({ html, react }) {
  if (html) return html;
  if (!react) return null;
  try {
    const { render } = await import("@react-email/render");
    return await render(react);
  } catch (err) {
    console.error("Failed to render email template:", err?.message);
    return null;
  }
}

/** Send budget alert (80%+ usage) to the user's login email. */
export async function sendBudgetAlertEmail({ to, subject, html }) {
  if (!to) {
    return { success: false, error: "Recipient email is required" };
  }
  return sendEmail({ to, subject, html });
}

export async function sendEmail({ to, subject, react, html }) {
  const htmlBody = await resolveHtmlBody({ html, react });
  if (!htmlBody) {
    return { success: false, error: "Email body is required" };
  }
  return deliverEmail({ to, subject, html: htmlBody });
}

// Send the monthly summary report as a rich HTML email to the logged-in user
export async function sendReportEmail({ transactions, monthlyExpenses, budgetDataList, monthKey }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const now = new Date();

  // Resolve the month to report on (defaults to current month)
  let reportDate = now;
  if (monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    reportDate = new Date(year, month - 1, 1);
  }

  const monthStart = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
  const monthEnd   = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0);
  const monthLabel = format(reportDate, "MMMM yyyy");

  const thisMonthTx = (transactions || []).filter((t) => {
    const d = new Date(t.date);
    return d >= monthStart && d <= monthEnd;
  });

  const totalIncome   = thisMonthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = thisMonthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const net           = totalIncome - totalExpenses;

  const byCategory = thisMonthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const recentTx = [...thisMonthTx]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  // ── Build category rows ──────────────────────────────────────────────────
  const categoryRows = sortedCategories.length
    ? sortedCategories.map(([cat, amt]) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;font-size:14px">${cat}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px">₹${amt.toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;font-size:14px">
            ${totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : 0}%
          </td>
        </tr>`).join("")
    : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#9ca3af">No expenses this month</td></tr>`;

  const txRows = recentTx.length
    ? recentTx.map((t) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${format(new Date(t.date), "dd MMM")}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${t.description || "—"}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-transform:capitalize">${t.category}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;color:${t.type === "EXPENSE" ? "#ef4444" : "#22c55e"}">
            ${t.type === "EXPENSE" ? "−" : "+"}₹${t.amount.toFixed(2)}
          </td>
        </tr>`).join("")
    : `<tr><td colspan="4" style="padding:12px;text-align:center;color:#9ca3af">No transactions this month</td></tr>`;

  const budgetRows = (budgetDataList || []).map((b) => {
    const pct = b.budget ? Math.min((b.currentExpenses / b.budget.amount) * 100, 100) : 0;
    const color = pct >= 90 ? "#ef4444" : pct >= 75 ? "#eab308" : "#22c55e";
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px">${b.accountName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px">${b.budget ? `₹${b.budget.amount.toFixed(2)}` : "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px">₹${b.currentExpenses.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:${color}">${b.budget ? `${pct.toFixed(1)}%` : "—"}</td>
      </tr>`;
  }).join("");

  const trendRows = (monthlyExpenses || []).map((m) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${m.month}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right">₹${m.total.toFixed(2)}</td>
    </tr>`).join("");

  // ── Build full HTML email body ────────────────────────────────────────────
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f9fc;padding:40px 0;margin:0">
  <div style="background:#fff;margin:0 auto;padding:40px;border-radius:8px;max-width:600px;border:1px solid #e5e7eb">

    <!-- Header -->
    <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 4px">Monthly Financial Report</h1>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px">
      Hello ${user.name || "there"} &nbsp;·&nbsp; Period: ${monthLabel} &nbsp;·&nbsp;
      Generated on ${format(now, "dd MMM yyyy")}
    </p>

    <!-- Stats -->
    <div style="display:flex;gap:12px;margin-bottom:28px">
      <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Income</div>
        <div style="font-size:20px;font-weight:700;color:#22c55e;margin-top:4px">₹${totalIncome.toFixed(2)}</div>
      </div>
      <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Expenses</div>
        <div style="font-size:20px;font-weight:700;color:#ef4444;margin-top:4px">₹${totalExpenses.toFixed(2)}</div>
      </div>
      <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Net Savings</div>
        <div style="font-size:20px;font-weight:700;color:${net >= 0 ? "#22c55e" : "#ef4444"};margin-top:4px">₹${net.toFixed(2)}</div>
      </div>
      <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Transactions</div>
        <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px">${thisMonthTx.length}</div>
      </div>
    </div>

    <!-- Budget -->
    <h2 style="font-size:15px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:0 0 12px">Budget Status</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Account</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280">Budget</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280">Spent</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280">Used</th>
      </tr></thead>
      <tbody>${budgetRows || `<tr><td colspan="4" style="padding:12px;text-align:center;color:#9ca3af">No budgets set</td></tr>`}</tbody>
    </table>

    <!-- Categories -->
    <h2 style="font-size:15px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:0 0 12px">Expenses by Category</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Category</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280">Amount</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280">% of Total</th>
      </tr></thead>
      <tbody>${categoryRows}</tbody>
    </table>

    <!-- Transactions -->
    <h2 style="font-size:15px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:0 0 12px">Recent Transactions</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Date</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Description</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Category</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280">Amount</th>
      </tr></thead>
      <tbody>${txRows}</tbody>
    </table>

    <!-- 12-month trend -->
    <h2 style="font-size:15px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:0 0 12px">12-Month Expense Trend</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280">Month</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280">Total Expenses</th>
      </tr></thead>
      <tbody>${trendRows}</tbody>
    </table>

    <!-- Footer -->
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">
      Welth Finance App &nbsp;·&nbsp; Made with ❤️ by Sanyukta Sardar and Taniisha Chakraborty
    </p>
  </div>
</body>
</html>`;

  try {
    const result = await deliverEmail({
      to: user.email,
      subject: `Your Financial Report — ${monthLabel}`,
      html: htmlBody,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, email: user.email };
  } catch (error) {
    console.error("Failed to send report email:", error);
    return { success: false, error: error.message };
  }
}
