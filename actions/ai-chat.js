"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import {
  buildLocalFinanceSnapshot,
  generateLocalFinanceReply,
} from "@/lib/finance-chat-model";

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

  const snapshot = buildLocalFinanceSnapshot({ accounts, transactions, budgets });
  return generateLocalFinanceReply(question, snapshot);
}
