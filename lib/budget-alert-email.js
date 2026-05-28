/** Plain HTML budget alert — same approach as the working report email. */

export function buildBudgetAlertHtml({
  userName,
  accountName,
  percentageUsed,
  budgetAmount,
  totalExpenses,
}) {
  const pct = Math.min(Number(percentageUsed), 100);
  const remaining = Math.max(Number(budgetAmount) - Number(totalExpenses), 0);
  const barColor = pct >= 90 ? "#ef4444" : pct >= 75 ? "#f59e0b" : "#16a34a";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f9fc;padding:40px 0;margin:0">
  <div style="background:#fff;margin:0 auto;padding:40px;border-radius:8px;max-width:560px;border:1px solid #e5e7eb">
    <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px">Budget Alert — 80% Threshold Reached</h1>
    <p style="color:#b45309;font-size:13px;font-weight:600;margin:0 0 16px;padding:8px 12px;background:#fffbeb;border-radius:6px;border:1px solid #fcd34d">
      You have used 80% or more of your monthly budget.
    </p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6">Hello ${userName || "there"},</p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6">
      Your spending for <strong>${accountName}</strong> has reached
      <strong>${pct.toFixed(1)}%</strong> of your monthly budget limit.
    </p>
    <table style="width:100%;margin:24px 0;border-collapse:separate;border-spacing:8px">
      <tr>
        <td style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center;width:33%">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Budget</div>
          <div style="font-size:18px;font-weight:700;color:#111827">₹${Number(budgetAmount).toFixed(2)}</div>
        </td>
        <td style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center;width:33%">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Spent</div>
          <div style="font-size:18px;font-weight:700;color:#ef4444">₹${Number(totalExpenses).toFixed(2)}</div>
        </td>
        <td style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;width:33%">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Remaining</div>
          <div style="font-size:18px;font-weight:700;color:#16a34a">₹${remaining.toFixed(2)}</div>
        </td>
      </tr>
    </table>
    <div style="background:#e5e7eb;border-radius:9999px;height:10px;overflow:hidden;margin:16px 0">
      <div style="height:100%;width:${pct}%;background:${barColor};border-radius:9999px"></div>
    </div>
    <p style="color:#9ca3af;font-size:13px;text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">
      Welth Finance — manage your budget in the dashboard
    </p>
  </div>
</body>
</html>`;
}
