import { getUserAccounts, getDashboardData, getMonthlyExpenses } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { AccountCard } from "./_components/account-card";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { BudgetProgress } from "./_components/budget-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DashboardOverview } from "./_components/transaction-overview";
import { MonthlyExpenseChart } from "./_components/monthly-expense-chart";
import { DownloadReportButton } from "./_components/download-report-button";

export default async function DashboardPage() {
  const [accounts, transactions, monthlyExpenses] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
    getMonthlyExpenses(),
  ]);

  // Fetch budget data for every account in parallel
  const budgetDataList = await Promise.all(
    (accounts || []).map(async (account) => {
      const data = await getCurrentBudget(account.id);
      return {
        accountId: account.id,
        accountName: account.name,
        isDefault: account.isDefault,
        budget: data?.budget ?? null,
        currentExpenses: data?.currentExpenses ?? 0,
      };
    })
  );

  const defaultAccountId =
    accounts?.find((a) => a.isDefault)?.id ?? budgetDataList[0]?.accountId;

  return (
    <div className="space-y-8">
      {/* Header row with download button */}
      <div className="flex items-center justify-between">
        <div /> {/* spacer */}
        <DownloadReportButton
          accounts={accounts || []}
          transactions={transactions || []}
          monthlyExpenses={monthlyExpenses || []}
          budgetDataList={budgetDataList}
        />
      </div>

      {/* Single Budget Progress bar — auto-selects default account */}
      <BudgetProgress
        budgetDataList={budgetDataList}
        defaultAccountId={defaultAccountId}
      />

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
