import { NextResponse } from "next/server";
import { checkAllBudgetAlerts } from "@/lib/budget-alerts";

/**
 * Catch-up for budget alerts (e.g. Vercel Cron every 6 hours).
 * Set CRON_SECRET in env and send: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await checkAllBudgetAlerts();
    const sent = results.filter((r) => r.sent).length;
    return NextResponse.json({ ok: true, checked: results.length, sent, results });
  } catch (error) {
    console.error("Budget alerts cron failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
