import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch financial context
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

    const toNum = (val) =>
      typeof val?.toNumber === "function" ? val.toNumber() : parseFloat(val) || 0;

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

    const systemPrompt = `You are a helpful personal finance assistant. Answer questions based on the user's financial data.
Be concise, friendly, and give actionable advice. Use ₹ for currency.

USER FINANCIAL SUMMARY:
- Accounts: ${accounts.map((a) => `${a.name} (${a.type}): ₹${toNum(a.balance).toFixed(2)}`).join(", ")}
- Total Balance: ₹${accounts.reduce((s, a) => s + toNum(a.balance), 0).toFixed(2)}
- Budget: ${budgets.length > 0 ? `₹${toNum(budgets[0].amount).toFixed(2)}/month` : "Not set"}
- Recent Income: ₹${totalIncome.toFixed(2)}
- Recent Expenses: ₹${totalExpenses.toFixed(2)}
- Top Expense Categories: ${Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
      .join(", ")}`;

    let reply;
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const result = await model.generateContent(
          `${systemPrompt}\n\nUSER QUESTION: ${message}`
        );
        reply = result?.response?.text?.();
      } catch (e) {
        if (!openai) throw e;
      }
    }

    if (!reply && openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });
      reply = response.choices[0]?.message?.content;
    }

    if (!reply && !genAI && !openai) {
      return NextResponse.json(
        { error: "Missing AI API key (set GEMINI_API_KEY or OPENAI_API_KEY)." },
        { status: 500 }
      );
    }

    if (!reply) return NextResponse.json({ error: "Empty response from AI" }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
