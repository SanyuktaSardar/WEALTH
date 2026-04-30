"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function askFinanceAI(question) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  // Fetch user's financial context
  const [accounts, transactions, budgets] = await Promise.all([
    db.account.findMany({
      where: { userId: user.id },
      select: { name: true, type: true, balance: true, isDefault: true },
    }),
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 50,
      select: { type: true, amount: true, category: true, date: true, description: true },
    }),
    db.budget.findMany({
      where: { userId: user.id },
      select: { amount: true },
    }),
  ]);

  const toNum = (val) => (typeof val?.toNumber === "function" ? val.toNumber() : parseFloat(val) || 0);

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + toNum(t.amount), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + toNum(t.amount), 0);

  const expenseByCategory = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + toNum(t.amount);
      return acc;
    }, {});

  const context = `
You are a helpful personal finance assistant. Answer questions based on the user's financial data below.
Be concise, friendly, and give actionable advice. Use ₹ for currency.

USER FINANCIAL SUMMARY:
- Accounts: ${accounts.map((a) => `${a.name} (${a.type}): ₹${toNum(a.balance).toFixed(2)}`).join(", ")}
- Total Balance: ₹${accounts.reduce((s, a) => s + toNum(a.balance), 0).toFixed(2)}
- Budget: ${budgets.length > 0 ? `₹${toNum(budgets[0].amount).toFixed(2)}/month` : "Not set"}
- Recent Income (last 50 transactions): ₹${totalIncome.toFixed(2)}
- Recent Expenses (last 50 transactions): ₹${totalExpenses.toFixed(2)}
- Top Expense Categories: ${Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
    .join(", ")}

USER QUESTION: ${question}
  `;

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });
  const result = await model.generateContent(context);
  const text = result.response.text();
  if (!text) throw new Error("Empty response from AI");
  return text;
}
