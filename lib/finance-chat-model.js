// ─── Helpers ────────────────────────────────────────────────────────────────

function toNum(val) {
  return typeof val?.toNumber === "function" ? val.toNumber() : parseFloat(val) || 0;
}

function fmt(amount) {
  return `₹${amount.toFixed(2)}`;
}

function fmtDate(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

// ─── Amount + Category Extraction ───────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  food:           ["food", "eat", "lunch", "dinner", "breakfast", "restaurant", "meal", "snack", "coffee", "cafe"],
  groceries:      ["groceries", "grocery", "supermarket", "vegetables", "fruits", "milk", "bread"],
  transportation: ["transport", "uber", "cab", "taxi", "bus", "train", "fuel", "petrol", "gas", "commute", "travel"],
  shopping:       ["shopping", "clothes", "clothing", "shoes", "amazon", "flipkart", "online", "bought"],
  entertainment:  ["movie", "netflix", "spotify", "game", "entertainment", "concert", "show", "subscription"],
  healthcare:     ["doctor", "medicine", "hospital", "pharmacy", "medical", "health", "clinic"],
  utilities:      ["electricity", "water", "internet", "phone", "bill", "utility", "recharge"],
  education:      ["course", "book", "tuition", "school", "college", "class", "study"],
  housing:        ["rent", "house", "apartment", "maintenance", "repair"],
  personal:       ["haircut", "gym", "salon", "beauty", "spa"],
  gifts:          ["gift", "donation", "charity", "present"],
  insurance:      ["insurance", "premium", "policy"],
  bills:          ["fee", "fine", "charge", "subscription"],
};

function extractAmount(text) {
  // Match patterns like: 200, $200, ₹200, 1,500, 1.5k, 2000.50
  const match = text.match(/[$₹]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*k?/i);
  if (!match) return null;
  let raw = match[1].replace(/,/g, "");
  const amount = parseFloat(raw) * (text.toLowerCase().includes("k") ? 1000 : 1);
  return isNaN(amount) ? null : amount;
}

function extractCategory(text) {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "other-expense";
}

// ─── Intent Classification ───────────────────────────────────────────────────

const INTENTS = [
  {
    name: "add_expense",
    patterns: [
      /\b(spent|paid|bought|purchased|spend|pay)\b/i,
      /\b(added|add)\s+(an?\s+)?expense\b/i,
    ],
  },
  {
    name: "view_summary",
    patterns: [
      /\b(summary|overview|report|show\s+(my\s+)?(expenses?|spending|transactions?))\b/i,
      /\bhow\s+(much|many)\s+(did\s+i|have\s+i)\s+(spend|spent)\b/i,
      /\bwhat.*(spend|spent|expenses?)\b/i,
    ],
  },
  {
    name: "budget_check",
    patterns: [
      /\b(over\s*budget|budget|limit|allowance)\b/i,
      /\bam\s+i\s+(over|within|on\s+track)\b/i,
      /\bhow\s+much\s+(is\s+left|remaining|do\s+i\s+have)\b/i,
    ],
  },
  {
    name: "biggest_expense",
    patterns: [
      /\b(biggest|largest|most|top|highest)\s+(expense|spending|category)\b/i,
      /\bwhere\s+(am\s+i|do\s+i)\s+spend(ing)?\b/i,
    ],
  },
  {
    name: "saving_tips",
    patterns: [
      /\b(save|saving|reduce|cut|lower|decrease)\s+(money|expense|spending|cost)\b/i,
      /\bhow\s+(can|do|should)\s+i\s+save\b/i,
      /\btips?\b/i,
    ],
  },
  {
    name: "income_check",
    patterns: [
      /\b(income|earned|salary|revenue|how\s+much\s+(did\s+i|have\s+i)\s+(earn|made?))\b/i,
    ],
  },
  {
    name: "recent_transactions",
    patterns: [
      /\b(recent|last|latest)\s+(transactions?|expenses?|activity)\b/i,
      /\bwhat\s+(did\s+i|have\s+i)\s+(buy|spend|pay)\s+recently\b/i,
    ],
  },
  {
    name: "spending_spike",
    patterns: [
      /\b(spike|unusual|anomaly|sudden|this\s+week|weekly)\b/i,
      /\bam\s+i\s+overspending\b/i,
    ],
  },
  {
    name: "balance_check",
    patterns: [
      /\b(balance|how\s+much\s+(money|do\s+i\s+have)|total\s+(money|funds?))\b/i,
    ],
  },
];

function detectIntent(text) {
  for (const { name, patterns } of INTENTS) {
    if (patterns.some((p) => p.test(text))) return name;
  }
  return "general";
}

// ─── Snapshot Builder ────────────────────────────────────────────────────────

function buildFinancialSnapshot({ accounts, transactions, budgets }) {
  const toN = (v) => toNum(v);

  const totalBalance = accounts.reduce((s, a) => s + toN(a.balance), 0);
  const incomeList = transactions.filter((t) => t.type === "INCOME");
  const expenseList = transactions.filter((t) => t.type === "EXPENSE");

  const totalIncome = incomeList.reduce((s, t) => s + toN(t.amount), 0);
  const totalExpenses = expenseList.reduce((s, t) => s + toN(t.amount), 0);

  // Category breakdown
  const expenseByCategory = expenseList.reduce((acc, t) => {
    const cat = t.category || "other-expense";
    acc[cat] = (acc[cat] || 0) + toN(t.amount);
    return acc;
  }, {});

  const topExpenseCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5).map((t) => ({
    type: t.type,
    amount: toN(t.amount),
    category: t.category || "other",
    description: t.description || t.category || "Transaction",
    date: t.date,
  }));

  // Weekly comparison
  const now = new Date();
  const MS = 24 * 60 * 60 * 1000;
  const weekAgo = new Date(now - 7 * MS);
  const twoWeeksAgo = new Date(now - 14 * MS);

  let thisWeek = 0;
  let lastWeek = 0;
  for (const t of expenseList) {
    const d = new Date(t.date);
    const amt = toN(t.amount);
    if (d >= weekAgo) thisWeek += amt;
    else if (d >= twoWeeksAgo) lastWeek += amt;
  }

  const weeklySpikeRatio = lastWeek > 0 ? thisWeek / lastWeek : null;
  const hasSpike = lastWeek >= 100 && weeklySpikeRatio !== null && weeklySpikeRatio >= 1.3;

  // Budget
  const monthlyBudget = budgets.length > 0 ? toN(budgets[0].amount) : 0;
  const budgetUsagePercent =
    monthlyBudget > 0 ? Math.round((totalExpenses / monthlyBudget) * 100) : null;

  // Current month expenses
  const now2 = new Date();
  const monthStart = new Date(now2.getFullYear(), now2.getMonth(), 1);
  const thisMonthExpenses = expenseList
    .filter((t) => new Date(t.date) >= monthStart)
    .reduce((s, t) => s + toN(t.amount), 0);

  return {
    totalBalance,
    totalIncome,
    totalExpenses,
    thisMonthExpenses,
    topExpenseCategories,
    recentTransactions,
    monthlyBudget,
    budgetUsagePercent,
    thisWeek,
    lastWeek,
    weeklySpikeRatio,
    hasSpike,
    accountCount: accounts.length,
  };
}

// ─── Response Generators ─────────────────────────────────────────────────────

function budgetAdvice(snap) {
  if (!snap.monthlyBudget) {
    return "You haven't set a monthly budget yet. Set one from the dashboard to track overspending.";
  }
  const remaining = snap.monthlyBudget - snap.thisMonthExpenses;
  if (snap.budgetUsagePercent > 100) {
    return `⚠️ You're over budget by ${fmt(snap.thisMonthExpenses - snap.monthlyBudget)} (${snap.budgetUsagePercent}% used). Try cutting your top expense category first.`;
  }
  if (snap.budgetUsagePercent > 85) {
    return `⚠️ You've used ${snap.budgetUsagePercent}% of your budget. Only ${fmt(remaining)} left — keep discretionary spending low.`;
  }
  return `✅ You're within budget (${snap.budgetUsagePercent}% used). You have ${fmt(remaining)} remaining this month.`;
}

function spikeAdvice(snap) {
  if (!snap.lastWeek && !snap.thisWeek) return "Not enough weekly data to detect spending spikes yet.";
  if (snap.hasSpike) {
    const pct = Math.round((snap.weeklySpikeRatio - 1) * 100);
    return `⚠️ Spending spike detected! This week: ${fmt(snap.thisWeek)} vs last week: ${fmt(snap.lastWeek)} (+${pct}%). Review your recent transactions.`;
  }
  return `✅ No spending spike this week. This week: ${fmt(snap.thisWeek)} vs last week: ${fmt(snap.lastWeek)}.`;
}

function recentList(snap) {
  if (!snap.recentTransactions.length) return "No recent transactions found.";
  return snap.recentTransactions
    .map((t) => `• ${fmtDate(t.date)} ${t.description} (${t.category}) — ${t.type === "EXPENSE" ? "-" : "+"}${fmt(t.amount)}`)
    .join("\n");
}

function topCategoriesLine(snap) {
  if (!snap.topExpenseCategories.length) return "No expense categories yet.";
  return snap.topExpenseCategories
    .map(([cat, amt], i) => `${i + 1}. ${cat}: ${fmt(amt)}`)
    .join("\n");
}

function savingTips(snap) {
  const tips = [];
  if (snap.topExpenseCategories.length > 0) {
    const [topCat, topAmt] = snap.topExpenseCategories[0];
    tips.push(`💡 Your biggest spend is ${topCat} (${fmt(topAmt)}). Even a 20% cut saves ${fmt(topAmt * 0.2)}/month.`);
  }
  if (snap.hasSpike) {
    tips.push(`💡 You had a spending spike this week — review what caused it and avoid repeat purchases.`);
  }
  if (snap.monthlyBudget && snap.budgetUsagePercent > 70) {
    tips.push(`💡 You've used ${snap.budgetUsagePercent}% of your budget. Pause non-essential purchases until next month.`);
  }
  tips.push(`💡 Transfer a fixed amount to savings right after receiving income — pay yourself first.`);
  tips.push(`💡 Review subscriptions monthly and cancel ones you haven't used in 30 days.`);
  return tips.join("\n");
}

// ─── Main Reply Generator ────────────────────────────────────────────────────

export function generateLocalFinanceReply(question, snapshot) {
  const intent = detectIntent(question);
  const snap = snapshot;

  const header = `Balance: ${fmt(snap.totalBalance)} | Income: ${fmt(snap.totalIncome)} | Expenses: ${fmt(snap.totalExpenses)}`;

  switch (intent) {
    case "add_expense": {
      const amount = extractAmount(question);
      const category = extractCategory(question);
      if (!amount) {
        return `I understood you want to add an expense, but I couldn't find an amount. Try: "I spent ₹200 on groceries". To actually save it, use the Add Transaction button.`;
      }
      return `Got it! You spent ${fmt(amount)} on ${category}. To save this transaction, tap **Add Transaction** and fill in the details. I can't write to your account directly from chat.`;
    }

    case "view_summary":
      return `📊 **Your Financial Summary**\n${header}\n\n**Top Expense Categories:**\n${topCategoriesLine(snap)}\n\n${budgetAdvice(snap)}`;

    case "budget_check":
      return `💰 **Budget Status**\n${header}\n\n${budgetAdvice(snap)}\n\n${spikeAdvice(snap)}`;

    case "biggest_expense": {
      if (!snap.topExpenseCategories.length) {
        return `${header}\n\nNo expense data yet. Start adding transactions to see your biggest spending categories.`;
      }
      const [topCat, topAmt] = snap.topExpenseCategories[0];
      return `📈 **Biggest Expense**\nYour top spending category is **${topCat}** at ${fmt(topAmt)}.\n\n**All categories:**\n${topCategoriesLine(snap)}\n\n${budgetAdvice(snap)}`;
    }

    case "saving_tips":
      return `💡 **Saving Tips**\n${header}\n\n${savingTips(snap)}`;

    case "income_check":
      return `💵 **Income Summary**\nTotal income recorded: ${fmt(snap.totalIncome)}\nTotal expenses: ${fmt(snap.totalExpenses)}\nNet savings: ${fmt(snap.totalIncome - snap.totalExpenses)}\n\n${budgetAdvice(snap)}`;

    case "recent_transactions":
      return `🕐 **Recent Transactions**\n${recentList(snap)}\n\n${header}`;

    case "spending_spike":
      return `📉 **Spending Analysis**\n${header}\n\n${spikeAdvice(snap)}\n\n${budgetAdvice(snap)}`;

    case "balance_check":
      return `💳 **Account Balance**\nTotal balance across ${snap.accountCount} account(s): **${fmt(snap.totalBalance)}**\n\nIncome: ${fmt(snap.totalIncome)} | Expenses: ${fmt(snap.totalExpenses)}\nNet: ${fmt(snap.totalIncome - snap.totalExpenses)}`;

    default:
      return `${header}\n\n${budgetAdvice(snap)}\n\n${spikeAdvice(snap)}\n\nYou can ask me:\n• "Show my spending summary"\n• "Am I over budget?"\n• "What's my biggest expense?"\n• "Give me saving tips"\n• "Show recent transactions"\n• "I spent ₹200 on groceries"`;
  }
}

export function buildLocalFinanceSnapshot(data) {
  return buildFinancialSnapshot(data);
}
