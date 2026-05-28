"use client";

import Link from "next/link";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const toneStyles = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
};

const insightIcon = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
};

const insightStyles = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200",
  danger: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200",
};

function StatGrid({ stats }) {
  if (!stats?.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg bg-background/80 border border-border/60 px-2 py-2 text-center"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
            {s.label}
          </p>
          <p className={cn("text-xs font-semibold mt-0.5 tabular-nums", toneStyles[s.tone] || toneStyles.neutral)}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function BudgetBar({ progress }) {
  if (!progress) return null;
  const barColor =
    progress.status === "danger"
      ? "bg-red-500"
      : progress.status === "warning"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span className="capitalize">{progress.label}</span>
        <span className="font-medium text-foreground">{progress.percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(progress.percent, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>₹{progress.spent?.toFixed(2)} spent</span>
        <span>₹{progress.budget?.toFixed(2)} budget</span>
      </div>
    </div>
  );
}

function CategoryBars({ categories, highlight }) {
  if (!categories?.length) {
    return <p className="text-xs text-muted-foreground mt-2">No expenses this month yet.</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {categories.map((c) => (
        <li key={c.name}>
          <div className="flex justify-between text-xs mb-1">
            <span className={cn("capitalize font-medium", highlight?.category === c.name && "text-blue-600")}>
              {c.name}
            </span>
            <span className="tabular-nums text-muted-foreground">₹{c.amount.toFixed(2)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500/80"
              style={{ width: `${c.percent}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TransactionList({ transactions }) {
  if (!transactions?.length) {
    return <p className="text-xs text-muted-foreground mt-2">No transactions yet.</p>;
  }
  return (
    <ul className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
      {transactions.map((t, i) => (
        <li
          key={`${t.date}-${i}`}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2.5 py-2"
        >
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
              t.type === "EXPENSE" ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
            )}
          >
            {t.type === "EXPENSE" ? (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{t.description}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {t.date} · {t.category}
            </p>
          </div>
          <span
            className={cn(
              "text-xs font-semibold tabular-nums shrink-0",
              t.type === "EXPENSE" ? "text-red-500" : "text-emerald-500"
            )}
          >
            {t.type === "EXPENSE" ? "−" : "+"}₹{t.amount.toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Insights({ insights }) {
  if (!insights?.length) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {insights.map((item, i) => {
        const Icon = insightIcon[item.tone] || Info;
        return (
          <div
            key={i}
            className={cn(
              "flex gap-2 rounded-lg border px-2.5 py-2 text-xs leading-snug",
              insightStyles[item.tone] || insightStyles.info
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function Actions({ actions }) {
  if (!actions?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.href} asChild size="sm" variant="secondary" className="h-8 text-xs gap-1">
          <Link href={a.href}>
            {a.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      ))}
    </div>
  );
}

export function ChatMessageBubble({ role, payload, isUser }) {
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 text-white px-3 py-2 text-sm">
          {typeof payload === "string" ? payload : payload?.text}
        </div>
      </div>
    );
  }

  const data = typeof payload === "string" ? { type: "text", body: payload } : payload;

  return (
    <div className="flex justify-start gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-600 to-blue-700 flex items-center justify-center shrink-0 mt-0.5">
        {data.type === "welcome" ? (
          <Wallet className="h-3.5 w-3.5 text-white" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-white" />
        )}
      </div>
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted/80 border border-border/50 px-3 py-2.5 text-sm">
        {data.title && (
          <p className="font-semibold text-foreground text-[13px]">{data.title}</p>
        )}
        {data.body && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{data.body}</p>
        )}
        {data.type === "add_expense" && data.amount && (
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-red-500 tabular-nums">
              ₹{Number(data.amount).toFixed(2)}
            </span>
            <span className="text-xs capitalize text-muted-foreground">{data.category}</span>
          </div>
        )}
        {data.highlight && (
          <p className="text-xs mt-2">
            Top category:{" "}
            <strong className="capitalize">{data.highlight.category}</strong> at ₹
            {data.highlight.amount.toFixed(2)}
          </p>
        )}
        <StatGrid stats={data.stats} />
        <BudgetBar progress={data.progress} />
        <CategoryBars categories={data.categories} highlight={data.highlight} />
        <TransactionList transactions={data.transactions} />
        <Insights insights={data.insights} />
        <Actions actions={data.actions} />
      </div>
    </div>
  );
}

export function SuggestionChips({ suggestions, onSelect, disabled }) {
  if (!suggestions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pl-9">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(s)}
          className="text-xs px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
