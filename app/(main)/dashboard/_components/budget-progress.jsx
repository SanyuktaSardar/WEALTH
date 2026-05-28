"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X, ChevronDown } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateBudget } from "@/actions/budget";

/**
 * budgetDataList: Array of {
 *   accountId: string,
 *   accountName: string,
 *   budget: { amount: number, ... } | null,
 *   currentExpenses: number,
 * }
 */
export function BudgetProgress({ budgetDataList = [] }) {
  const [selectedId, setSelectedId] = useState(
    budgetDataList[0]?.accountId ?? null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  const selected = budgetDataList.find((b) => b.accountId === selectedId);

  // Sync input when selected account changes
  useEffect(() => {
    setNewBudget(selected?.budget?.amount?.toString() ?? "");
    setIsEditing(false);
  }, [selectedId, selected?.budget?.amount]);

  const {
    loading: isLoading,
    fn: updateBudgetFn,
    error,
  } = useFetch(updateBudget);

  useEffect(() => {
    if (error) toast.error(error.message || "Failed to update budget");
  }, [error]);

  if (!budgetDataList.length) return null;

  const currentExpenses = selected?.currentExpenses ?? 0;
  const budgetAmount = selected?.budget?.amount ?? 0;
  const percentUsed = budgetAmount > 0
    ? Math.min((currentExpenses / budgetAmount) * 100, 100)
    : 0;

  const progressColor =
    percentUsed >= 90 ? "#ef4444" :
    percentUsed >= 75 ? "#eab308" :
    "#22c55e";

  const handleUpdateBudget = async () => {
    const amount = parseFloat(newBudget);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const result = await updateBudgetFn(selectedId, amount);
    if (result?.success) {
      setIsEditing(false);
      toast.success("Budget updated successfully");
    }
  };

  const handleCancel = () => {
    setNewBudget(selected?.budget?.amount?.toString() ?? "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium whitespace-nowrap">
              Monthly Budget
            </CardTitle>

            {/* Account selector button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                >
                  {selected?.accountName ?? "Select account"}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {budgetDataList.map((b) => (
                  <DropdownMenuItem
                    key={b.accountId}
                    onClick={() => setSelectedId(b.accountId)}
                    className={b.accountId === selectedId ? "font-semibold" : ""}
                  >
                    {b.accountName}
                    {b.budget
                      ? ` — ₹${b.budget.amount.toFixed(2)}`
                      : " — no budget"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Spend description + edit */}
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-32 h-7 text-sm"
                  placeholder="Enter amount"
                  autoFocus
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleUpdateBudget}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <>
                <CardDescription className="text-xs">
                  {selected?.budget
                    ? `₹${currentExpenses.toFixed(2)} of ₹${budgetAmount.toFixed(2)} spent`
                    : "No budget set — click ✏️ to add one"}
                </CardDescription>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Percentage badge */}
        {selected?.budget && (
          <span
            className="ml-4 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: progressColor + "22",
              color: progressColor,
            }}
          >
            {percentUsed.toFixed(1)}%
          </span>
        )}
      </CardHeader>

      <CardContent>
        {selected?.budget ? (
          <div className="space-y-1.5">
            <Progress value={percentUsed} indicatorColor={progressColor} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹0</span>
              <span>₹{budgetAmount.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Set a monthly budget for <strong>{selected?.accountName}</strong> to track spending.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
