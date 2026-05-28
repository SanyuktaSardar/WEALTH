import { db } from "@/lib/prisma";
import { sendBudgetAlertEmail } from "@/actions/send-email";
import { buildBudgetAlertHtml } from "@/lib/budget-alert-email";
import { resolveUserEmail } from "@/lib/resolve-user-email";

const ALERT_THRESHOLD = 80;

function getMonthRange(referenceDate = new Date()) {
  const startOfMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const endOfMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { startOfMonth, endOfMonth };
}

function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

/**
 * Check one account's monthly spend against its budget.
 * Sends at most one alert email per calendar month when usage crosses 80%.
 */
export async function checkBudgetAlertForAccount({ userId, accountId }) {
  if (!userId || !accountId) return { skipped: "missing ids" };

  const budget = await db.budget.findUnique({ where: { accountId } });
  if (!budget) return { skipped: "no budget" };

  const now = new Date();
  const { startOfMonth, endOfMonth } = getMonthRange(now);

  const expenses = await db.transaction.aggregate({
    where: {
      userId,
      accountId,
      type: "EXPENSE",
      status: "COMPLETED",
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
  });

  const totalExpenses = expenses._sum.amount?.toNumber() || 0;
  const budgetAmount = budget.amount.toNumber();
  const percentageUsed =
    budgetAmount > 0 ? (totalExpenses / budgetAmount) * 100 : 0;

  // Reset alert flag when back under threshold so crossing 80% again can notify
  if (percentageUsed < ALERT_THRESHOLD) {
    if (budget.lastAlertSent) {
      await db.budget.update({
        where: { id: budget.id },
        data: { lastAlertSent: null },
      });
    }
    return { skipped: "below threshold", percentageUsed };
  }

  if (budget.lastAlertSent && !isNewMonth(new Date(budget.lastAlertSent), now)) {
    return { skipped: "already alerted this month", percentageUsed };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!user || !account) {
    return { skipped: "user or account not found" };
  }

  const email = await resolveUserEmail(user);
  if (!email) {
    return { skipped: "no email on file" };
  }

  const html = buildBudgetAlertHtml({
    userName: user.name,
    accountName: account.name,
    percentageUsed,
    budgetAmount,
    totalExpenses,
  });

  const emailResult = await sendBudgetAlertEmail({
    to: email,
    subject: `Budget Alert (80%+): ${percentageUsed.toFixed(1)}% used — ${account.name}`,
    html,
  });

  if (!emailResult?.success) {
    console.error("[budget-alert] Email failed:", emailResult?.error, "to:", email);
    return {
      skipped: "email failed",
      percentageUsed,
      error: emailResult?.error,
      email,
    };
  }

  await db.budget.update({
    where: { id: budget.id },
    data: { lastAlertSent: now },
  });

  console.info(
    `[budget-alert] Sent to ${email} — ${percentageUsed.toFixed(1)}% for ${account.name}`
  );

  return { sent: true, percentageUsed, email };
}

/**
 * Run budget alert check and send email if threshold is met.
 * Must be awaited in server actions so the email completes before the request ends.
 */
export async function triggerBudgetAlertCheck({ userId, accountId }) {
  if (!userId || !accountId) return null;
  try {
    return await checkBudgetAlertForAccount({ userId, accountId });
  } catch (err) {
    console.warn("Budget alert check failed (non-fatal):", err?.message);
    return { error: err?.message };
  }
}

/** Check all budgets (e.g. from a cron route). */
export async function checkAllBudgetAlerts() {
  const budgets = await db.budget.findMany({
    select: { userId: true, accountId: true },
  });

  const results = [];
  for (const { userId, accountId } of budgets) {
    try {
      const result = await checkBudgetAlertForAccount({ userId, accountId });
      results.push({ accountId, ...result });
    } catch (error) {
      console.warn(`Budget alert failed for account ${accountId}:`, error?.message);
      results.push({ accountId, error: error?.message });
    }
  }
  return results;
}
