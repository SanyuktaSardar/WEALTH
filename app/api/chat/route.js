import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import {
  buildLocalFinanceSnapshot,
  generateLocalFinanceReply,
} from "@/lib/finance-chat-model";

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
        select: {
          type: true,
          amount: true,
          category: true,
          date: true,
          description: true,
          accountId: true,
        },
      }),
      db.budget.findMany({
        where: { userId: user.id },
        select: { amount: true, accountId: true },
      }),
    ]);

    const snapshot = buildLocalFinanceSnapshot({ accounts, transactions, budgets });
    const reply = generateLocalFinanceReply(message, snapshot);

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
