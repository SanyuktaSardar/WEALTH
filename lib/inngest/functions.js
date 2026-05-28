import { inngest } from "./client";
import { db } from "@/lib/prisma";
import EmailTemplate from "@/emails/templates";
import { sendEmail } from "@/actions/send-email";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── 1. Process individual recurring transaction ─────────────────────────────
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: { limit: 10, period: "1m", key: "event.data.userId" },
    triggers: [{ event: "transaction.recurring.process" }],
  },
  async ({ event, step }) => {
    if (!event?.data?.transactionId || !event?.data?.userId) {
      return { error: "Missing required event data" };
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: { id: event.data.transactionId, userId: event.data.userId },
        include: { account: true },
      });

      if (!transaction || !isTransactionDue(transaction)) return;

      await db.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });

        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(
              new Date(),
              transaction.recurringInterval
            ),
          },
        });
      });
    });
  }
);

// ─── 2. Trigger recurring transactions daily ─────────────────────────────────
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
    triggers: [{ cron: "0 0 * * *" }],
  },
  async ({ step }) => {
    const recurringTransactions = await step.run(
      "fetch-recurring-transactions",
      async () =>
        db.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            OR: [
              { lastProcessed: null },
              { nextRecurringDate: { lte: new Date() } },
            ],
          },
        })
    );

    if (recurringTransactions.length > 0) {
      await inngest.send(
        recurringTransactions.map((t) => ({
          name: "transaction.recurring.process",
          data: { transactionId: t.id, userId: t.userId },
        }))
      );
    }

    return { triggered: recurringTransactions.length };
  }
);

// ─── 3. Monthly report — fires at 23:00 on the last day of every month ───────
export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
    triggers: [{ cron: "0 23 28-31 * *" }],
  },
  async ({ step }) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (tomorrow.getDate() !== 1) {
      return { skipped: "Not the last day of the month" };
    }

    const users = await step.run("fetch-users", async () =>
      db.user.findMany({ include: { accounts: true } })
    );

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const stats = await getMonthlyStats(user.id, now);
        const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
        const insights = await generateFinancialInsights(stats, monthLabel);

        // Per-account budget data
        const budgets = await db.budget.findMany({
          where: { userId: user.id },
        });

        const budgetDataList = await Promise.all(
          user.accounts.map(async (account) => {
            const budget = budgets.find((b) => b.accountId === account.id);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const expenses = await db.transaction.aggregate({
              where: {
                userId: user.id,
                accountId: account.id,
                type: "EXPENSE",
                date: { gte: startOfMonth },
              },
              _sum: { amount: true },
            });
            return {
              accountName: account.name,
              budget: budget ? { amount: budget.amount.toNumber() } : null,
              currentExpenses: expenses._sum.amount?.toNumber() || 0,
            };
          })
        );

        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report — ${monthLabel}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: { stats, month: monthLabel, insights, budgetDataList },
          }),
        });
      });
    }

    return { processed: users.length };
  }
);

// ─── 4. Immediate budget alert — triggered by budget.check event ─────────────
// Fired from createTransaction whenever an EXPENSE is saved.
// Sends alert email once per month per account when spending crosses 80%.
export const handleBudgetCheck = inngest.createFunction(
  {
    id: "handle-budget-check",
    name: "Handle Budget Check",
    triggers: [{ event: "budget.check" }],
  },
  async ({ event, step }) => {
    const { userId, accountId } = event.data;
    if (!userId || !accountId) return { error: "Missing userId or accountId" };

    await step.run("check-and-alert", async () => {
      const budget = await db.budget.findUnique({ where: { accountId } });
      if (!budget) return; // No budget set for this account

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Already sent alert this month — skip
      if (
        budget.lastAlertSent &&
        !isNewMonth(new Date(budget.lastAlertSent), now)
      ) {
        return;
      }

      const expenses = await db.transaction.aggregate({
        where: {
          userId,
          accountId,
          type: "EXPENSE",
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      });

      const totalExpenses = expenses._sum.amount?.toNumber() || 0;
      const budgetAmount = budget.amount.toNumber();
      const percentageUsed = (totalExpenses / budgetAmount) * 100;

      if (percentageUsed < 80) return; // Not yet at threshold

      // Fetch user + account details for the email
      const user = await db.user.findUnique({ where: { id: userId } });
      const account = await db.account.findUnique({ where: { id: accountId } });
      if (!user || !account) return;

      await sendEmail({
        to: user.email,
        subject: `⚠️ Budget Alert: ${percentageUsed.toFixed(1)}% used for ${account.name}`,
        react: EmailTemplate({
          userName: user.name,
          type: "budget-alert",
          data: {
            percentageUsed,
            budgetAmount,
            totalExpenses,
            accountName: account.name,
          },
        }),
      });

      // Mark alert sent so it won't fire again this month
      await db.budget.update({
        where: { id: budget.id },
        data: { lastAlertSent: now },
      });
    });
  }
);

// ─── 5. Periodic budget alerts every 6 hours (catch-up for missed events) ────
export const checkBudgetAlerts = inngest.createFunction(
  {
    id: "check-budget-alerts",
    name: "Check Budget Alerts",
    triggers: [{ cron: "0 */6 * * *" }],
  },
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () =>
      db.budget.findMany({
        include: { user: true, account: true },
      })
    );

    for (const budget of budgets) {
      await step.run(`check-budget-${budget.id}`, async () => {
        const now = new Date();

        // Already sent alert this month — skip
        if (
          budget.lastAlertSent &&
          !isNewMonth(new Date(budget.lastAlertSent), now)
        ) {
          return;
        }

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: budget.accountId,
            type: "EXPENSE",
            date: { gte: startOfMonth },
          },
          _sum: { amount: true },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount.toNumber();
        const percentageUsed = (totalExpenses / budgetAmount) * 100;

        if (percentageUsed < 80) return;

        await sendEmail({
          to: budget.user.email,
          subject: `⚠️ Budget Alert: ${percentageUsed.toFixed(1)}% used for ${budget.account.name}`,
          react: EmailTemplate({
            userName: budget.user.name,
            type: "budget-alert",
            data: {
              percentageUsed,
              budgetAmount,
              totalExpenses,
              accountName: budget.account.name,
            },
          }),
        });

        await db.budget.update({
          where: { id: budget.id },
          data: { lastAlertSent: now },
        });
      });
    }
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

function isTransactionDue(transaction) {
  if (!transaction.lastProcessed) return true;
  return new Date(transaction.nextRecurringDate) <= new Date();
}

function calculateNextRecurringDate(date, interval) {
  const next = new Date(date);
  switch (interval) {
    case "DAILY":   next.setDate(next.getDate() + 1);         break;
    case "WEEKLY":  next.setDate(next.getDate() + 7);         break;
    case "MONTHLY": next.setMonth(next.getMonth() + 1);       break;
    case "YEARLY":  next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

async function getMonthlyStats(userId, month) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate   = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
  });

  return transactions.reduce(
    (stats, t) => {
      const amount = t.amount.toNumber();
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    { totalExpenses: 0, totalIncome: 0, byCategory: {}, transactionCount: transactions.length }
  );
}

async function generateFinancialInsights(stats, month) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const prompt = `Analyze this financial data and provide 3 concise, actionable insights.
Financial Data for ${month}:
- Total Income: ₹${stats.totalIncome}
- Total Expenses: ₹${stats.totalExpenses}
- Net Income: ₹${stats.totalIncome - stats.totalExpenses}
- Expense Categories: ${Object.entries(stats.byCategory).map(([c, a]) => `${c}: ₹${a}`).join(", ")}
Format as JSON array: ["insight 1", "insight 2", "insight 3"]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(text);
  } catch {
    return [
      "Your highest expense category this month might need attention.",
      "Consider reviewing your recurring expenses to identify savings.",
      "Track your spending daily to stay within budget next month.",
    ];
  }
}
