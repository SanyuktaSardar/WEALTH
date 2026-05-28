import { Suspense } from "react";
import { getUserAccounts, getDashboardData, getMonthlyExpenses } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { AccountCard } from "./_components/account-card";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { BudgetProgress } from "./_components/budget-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DashboardOverview } from "./_components/transaction-overview";
import { MonthlyExpenseChart } from "./_components/monthly-expense-chart";

export default async function DashboardPage() {
  const [accounts, transactions, monthlyExpenses] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
    getMonthlyExpenses(),
  ]);

  // Fetch budget for every account in parallel
  const budgetDataList = await Promise.all(
    (accounts || []).map((account) =>
      getCurrentBudget(account.id).then((data) => ({
        accountId: account.id,
        accountName: account.name,
        ...data,
      }))
    )
  );

  return (
    <div className="space-y-8">
      {/* Per-account Budget Progress */}
      {budgetDataList.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgetDataList.map((bd) => (
            <BudgetProgress
              key={bd.accountId}
              accountId={bd.accountId}
              accountName={bd.accountName}
              initialBudget={bd.budget}
              currentExpenses={bd.currentExpenses || 0}
            />
          ))}
        </div>
      )}

      {/* Dashboard Overview */}
      <DashboardOverview
        accounts={accounts}
        transactions={transactions || []}
      />

      {/* Monthly Expense Line Chart */}
      <MonthlyExpenseChart data={monthlyExpenses} />

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {accounts.length > 0 &&
          accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
}
