import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.DIRECT_URL
);

export async function POST(req) {
  const { message, userId } = await req.json();

  // Step 1: Extract intent using AI
  const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a finance assistant.

ONLY respond in JSON.

Allowed intents:
- get_total_spending
- get_category_spending
- add_transaction
- get_budget_status

If question is not finance-related, return:
{ "intent": "unsupported" }
          `,
        },
        { role: "user", content: message },
      ],
    }),
  });

  const aiData = await aiResponse.json();
  const parsed = JSON.parse(aiData.choices[0].message.content);

  // Step 2: Handle intents
  switch (parsed.intent) {
    case "get_total_spending":
      return await getTotalSpending(userId);

    case "get_category_spending":
      return await getCategorySpending(userId, parsed.category);

    case "add_transaction":
      return await addTransaction(userId, parsed);

    case "get_budget_status":
      return await getBudgetStatus(userId);

    default:
      return NextResponse.json({
        reply: "Sorry, I am unable to solve this problem. Ask your budget-related question.",
      });
  }
}

async function getTotalSpending(userId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId);

  const total = data.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({
    reply: `You spent ₹${total} in total.`,
  });
}

async function getCategorySpending(userId, category) {
  const { data } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("category", category);

  const total = data.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({
    reply: `You spent ₹${total} on ${category}.`,
  });
}

async function addTransaction(userId, parsed) {
  const { amount, category } = parsed;

  await supabase.from("transactions").insert([
    {
      user_id: userId,
      amount,
      category,
    },
  ]);

  return NextResponse.json({
    reply: `Added ₹${amount} to ${category}.`,
  });
}

async function getBudgetStatus(userId) {
  const { data: budget } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount");

  const spent = transactions.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({
    reply: `You spent ₹${spent} out of ₹${budget.limit}.`,
  });
}
