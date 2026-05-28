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

const CATEGORY_KEYWORDS = {
  food: ["food", "eat", "lunch", "dinner", "breakfast", "restaurant", "meal", "snack", "coffee", "cafe", "cake"],
  groceries: ["groceries", "grocery", "supermarket", "vegetables", "fruits", "milk", "bread"],
  transportation: ["transport", "uber", "cab", "taxi", "bus", "train", "fuel", "petrol", "gas", "commute", "travel"],
  shopping: ["shopping", "clothes", "clothing", "shoes", "amazon", "flipkart", "online", "bought"],
  entertainment: ["movie", "netflix", "spotify", "game", "entertainment", "concert", "show", "subscription"],
  healthcare: ["doctor", "medicine", "hospital", "pharmacy", "medical", "health", "clinic"],
  utilities: ["electricity", "water", "internet", "phone", "bill", "utility", "recharge"],
  education: ["course", "book", "tuition", "school", "college", "class", "study", "physics"],
  housing: ["rent", "house", "apartment", "maintenance", "repair"],
  personal: ["haircut", "gym", "salon", "beauty", "spa"],
  gifts: ["gift", "donation", "charity", "present"],
  insurance: ["insurance", "premium", "policy"],
  bills: ["fee", "fine", "charge", "subscription"],
};

function extractAmount(text) {
  const match = text.match(/[$₹]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*k?/i);
  if (!match) return null;
  const raw = match[1].replace(/,/g, "");
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

const INTENTS = [
  { name: "add_expense", patterns: [/\b(spent|paid|bought|purchased|spend|pay)\b/i, /\b(added|add)\s+(an?\s+)?expense\b/i] },
  { name: "view_summary", patterns: [/\b(summary|overview|report|show\s+(my\s+)?(expenses?|spending|transactions?))\b/i, /\bhow\s+(much|many)\s+(did\s+i|have\s+i)\s+(spend|spent)\b/i] },
  { name: "budget_check", patterns: [/\b(over\s*budget|budget|limit|allowance)\b/i, /\bam\s+i\s+(over|within|on\s+track)\b/i, /\bhow\s+much\s+(is\s+left|remaining|do\s+i\s+have)\b/i] },
  { name: "biggest_expense", patterns: [/\b(biggest|largest|most|top|highest)\s+(expense|spending|category)\b/i, /\bwhere\s+(am\s+i|do\s+i)\s+spend(ing)?\b/i] },
  { name: "saving_tips", patterns: [/\b(save|saving|reduce|cut|lower|decrease)\s+(money|expense|spending|cost)\b/i, /\bhow\s+(can|do|should)\s+i\s+save\b/i, /\btips?\b/i] },
  { name: "income_check", patterns: [/\b(income|earned|salary|revenue|how\s+much\s+(did\s+i|have\s+i)\s+(earn|made?))\b/i] },
  { name: "recent_transactions", patterns: [/\b(recent|last|latest)\s+(transactions?|expenses?|activity)\b/i, /\bwhat\s+(did\s+i|have\s+i)\s+(buy|spend|pay)\s+recently\b/i] },
  { name: "spending_spike", patterns: [/\b(spike|unusual|anomaly|sudden|this\s+week|weekly)\b/i, /\bam\s+i\s+overspending\b/i] },
  { name: "balance_check", patterns: [/\b(balance|how\s+much\s+(money|do\s+i\s+have)|total\s+(money|funds?))\b/i] },
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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
  const defaultBudget = defaultAccount
    ? budgets.find((b) => b.accountId === defaultAccount.id)
    : budgets[0];

  const thisMonthExpenses = expenseList
    .filter((t) => {
      const d = new Date(t.date);
      const inMonth = d >= monthStart && d <= monthEnd;
      const onAccount = defaultAccount ? t.accountId === defaultAccount.id : true;
      return inMonth && onAccount;
    })
    .reduce((s, t) => s + toN(t.amount), 0);

  const expenseByCategory = expenseList
    .filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    })
    .reduce((acc, t) => {
      const cat = t.category || "other-expense";
      acc[cat] = (acc[cat] || 0) + toN(t.amount);
      return acc;
    }, {});

  const topExpenseCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recentTransactions = transactions.slice(0, 8).map((t) => ({
    type: t.type,
    amount: toN(t.amount),
    category: t.category || "other",
    description: t.description || t.category || "Transaction",
    date: t.date,
  }));

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

  const monthlyBudget = defaultBudget ? toN(defaultBudget.amount) : 0;
  const budgetUsagePercent =
    monthlyBudget > 0 ? Math.round((thisMonthExpenses / monthlyBudget) * 100) : null;

  return {
    totalBalance,
    totalIncome,
    totalExpenses,
    thisMonthExpenses,
    topExpenseCategories,
    recentTransactions,
    monthlyBudget,
    budgetUsagePercent,
    budgetAccountName: defaultAccount?.name || "your account",
    thisWeek,
    lastWeek,
    weeklySpikeRatio,
    hasSpike,
    accountCount: accounts.length,
    netSavings: totalIncome - totalExpenses,
  };
}

// ─── Structured message builders ─────────────────────────────────────────────

const DEFAULT_SUGGESTIONS = [
  "Show my spending summary",
  "Am I over budget?",
  "What's my biggest expense?",
  "Show recent transactions",
];

function baseStats(snap) {
  return [
    { label: "Balance", value: fmt(snap.totalBalance), tone: "neutral" },
    { label: "Income", value: fmt(snap.totalIncome), tone: "positive" },
    { label: "Expenses", value: fmt(snap.totalExpenses), tone: "negative" },
  ];
}

function budgetProgress(snap) {
  if (!snap.monthlyBudget) return null;
  const pct = Math.min(snap.budgetUsagePercent ?? 0, 100);
  const status = pct > 100 ? "danger" : pct >= 80 ? "warning" : "good";
  return {
    percent: pct,
    label: `${snap.budgetAccountName} · this month`,
    spent: snap.thisMonthExpenses,
    budget: snap.monthlyBudget,
    remaining: Math.max(snap.monthlyBudget - snap.thisMonthExpenses, 0),
    status,
  };
}

function budgetInsights(snap) {
  const insights = [];
  if (!snap.monthlyBudget) {
    insights.push({
      tone: "info",
      text: "Set a monthly budget on your dashboard to track overspending.",
    });
    return insights;
  }
  const remaining = snap.monthlyBudget - snap.thisMonthExpenses;
  if (snap.budgetUsagePercent > 100) {
    insights.push({
      tone: "danger",
      text: `Over budget by ${fmt(snap.thisMonthExpenses - snap.monthlyBudget)} (${snap.budgetUsagePercent}% of ${fmt(snap.monthlyBudget)}).`,
    });
  } else if (snap.budgetUsagePercent >= 80) {
    insights.push({
      tone: "warning",
      text: `${snap.budgetUsagePercent}% used — only ${fmt(remaining)} left this month.`,
    });
  } else {
    insights.push({
      tone: "success",
      text: `Within budget (${snap.budgetUsagePercent}% used). ${fmt(remaining)} remaining.`,
    });
  }
  if (snap.hasSpike) {
    const pct = Math.round((snap.weeklySpikeRatio - 1) * 100);
    insights.push({
      tone: "warning",
      text: `Spending spike: ${fmt(snap.thisWeek)} this week vs ${fmt(snap.lastWeek)} last week (+${pct}%).`,
    });
  } else if (snap.thisWeek || snap.lastWeek) {
    insights.push({
      tone: "success",
      text: `No spike this week (${fmt(snap.thisWeek)} vs ${fmt(snap.lastWeek)} last week).`,
    });
  }
  return insights;
}

function categoriesBlock(snap) {
  const total = snap.topExpenseCategories.reduce((s, [, a]) => s + a, 0);
  return snap.topExpenseCategories.map(([name, amount]) => ({
    name: name.replace(/-/g, " "),
    amount,
    percent: total > 0 ? Math.round((amount / total) * 100) : 0,
  }));
}

function transactionsBlock(snap) {
  return snap.recentTransactions.map((t) => ({
    date: fmtDate(t.date),
    description: t.description,
    category: t.category,
    amount: t.amount,
    type: t.type,
  }));
}

// ─── Main Reply Generator (structured) ───────────────────────────────────────

export function generateLocalFinanceReply(question, snapshot) {
  const intent = detectIntent(question);
  const snap = snapshot;

  switch (intent) {
    case "add_expense": {
      const amount = extractAmount(question);
      const category = extractCategory(question);
      if (!amount) {
        return {
          type: "text",
          title: "Add expense",
          body: "I couldn't find an amount. Try: \"I spent ₹200 on groceries\"",
          actions: [{ label: "Add transaction", href: "/transaction/create" }],
          suggestions: ["I spent ₹500 on groceries"],
        };
      }
      return {
        type: "add_expense",
        title: "Expense detected",
        amount,
        category: category.replace(/-/g, " "),
        body: `You mentioned ${fmt(amount)} on ${category.replace(/-/g, " ")}. Save it as a real transaction below.`,
        actions: [{ label: "Add transaction", href: "/transaction/create" }],
        suggestions: ["Show recent transactions", "Am I over budget?"],
      };
    }

    case "view_summary":
      return {
        type: "summary",
        title: "Spending summary",
        stats: baseStats(snap),
        progress: budgetProgress(snap),
        categories: categoriesBlock(snap),
        insights: budgetInsights(snap),
        suggestions: ["Am I over budget?", "Give me saving tips"],
      };

    case "budget_check":
      return {
        type: "budget",
        title: "Budget status",
        stats: [
          { label: "Spent (month)", value: fmt(snap.thisMonthExpenses), tone: "negative" },
          { label: "Budget", value: snap.monthlyBudget ? fmt(snap.monthlyBudget) : "Not set", tone: "neutral" },
          {
            label: "Remaining",
            value: snap.monthlyBudget ? fmt(Math.max(snap.monthlyBudget - snap.thisMonthExpenses, 0)) : "—",
            tone: snap.budgetUsagePercent > 100 ? "negative" : "positive",
          },
        ],
        progress: budgetProgress(snap),
        insights: budgetInsights(snap),
        suggestions: ["What's my biggest expense?", "Show recent transactions"],
      };

    case "biggest_expense": {
      const [topCat, topAmt] = snap.topExpenseCategories[0] || [];
      return {
        type: "categories",
        title: "Biggest expenses",
        highlight: topCat
          ? { category: topCat.replace(/-/g, " "), amount: topAmt }
          : null,
        categories: categoriesBlock(snap),
        progress: budgetProgress(snap),
        insights: budgetInsights(snap),
        suggestions: ["Give me saving tips", "Show my spending summary"],
      };
    }

    case "saving_tips": {
      const tips = [];
      if (snap.topExpenseCategories.length) {
        const [cat, amt] = snap.topExpenseCategories[0];
        tips.push({
          tone: "info",
          text: `Cut ${cat.replace(/-/g, " ")} by 20% → save ${fmt(amt * 0.2)}/month.`,
        });
      }
      if (snap.budgetUsagePercent > 70) {
        tips.push({ tone: "warning", text: "Pause non-essential spending until next month." });
      }
      tips.push({ tone: "info", text: "Pay yourself first — move savings right after income." });
      tips.push({ tone: "info", text: "Review subscriptions monthly; cancel unused ones." });
      return {
        type: "tips",
        title: "Saving tips",
        stats: baseStats(snap),
        insights: tips,
        suggestions: ["Am I over budget?", "Show recent transactions"],
      };
    }

    case "income_check":
      return {
        type: "summary",
        title: "Income overview",
        stats: [
          { label: "Income", value: fmt(snap.totalIncome), tone: "positive" },
          { label: "Expenses", value: fmt(snap.totalExpenses), tone: "negative" },
          { label: "Net", value: fmt(snap.netSavings), tone: snap.netSavings >= 0 ? "positive" : "negative" },
        ],
        insights: budgetInsights(snap),
        suggestions: DEFAULT_SUGGESTIONS,
      };

    case "recent_transactions":
      return {
        type: "transactions",
        title: "Recent transactions",
        transactions: transactionsBlock(snap),
        stats: baseStats(snap),
        suggestions: ["Am I over budget?", "What's my biggest expense?"],
      };

    case "spending_spike":
      return {
        type: "budget",
        title: "Spending analysis",
        stats: [
          { label: "This week", value: fmt(snap.thisWeek), tone: "negative" },
          { label: "Last week", value: fmt(snap.lastWeek), tone: "neutral" },
        ],
        insights: budgetInsights(snap),
        progress: budgetProgress(snap),
        suggestions: ["Show recent transactions", "Give me saving tips"],
      };

    case "balance_check":
      return {
        type: "summary",
        title: "Account balance",
        stats: [
          { label: "Total balance", value: fmt(snap.totalBalance), tone: "neutral" },
          { label: "Accounts", value: String(snap.accountCount), tone: "neutral" },
          { label: "Net (all time)", value: fmt(snap.netSavings), tone: snap.netSavings >= 0 ? "positive" : "negative" },
        ],
        suggestions: DEFAULT_SUGGESTIONS,
      };

    default:
      return {
        type: "text",
        title: "How can I help?",
        body: "Ask about your budget, spending, or recent transactions.",
        stats: baseStats(snap),
        insights: budgetInsights(snap),
        suggestions: DEFAULT_SUGGESTIONS,
      };
  }
}

export function buildLocalFinanceSnapshot(data) {
  return buildFinancialSnapshot(data);
}

export const WELCOME_MESSAGE = {
  type: "welcome",
  title: "Finance Assistant",
  body: "Ask me about spending, budget, or savings. Everything runs locally — your data stays private.",
  suggestions: DEFAULT_SUGGESTIONS,
};
