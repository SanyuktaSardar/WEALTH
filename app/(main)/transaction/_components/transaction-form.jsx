"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { cn } from "@/lib/utils";
import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import { ReceiptScanner } from "./recipt-scanner";

export function AddTransactionForm({
  accounts,
  categories,
  editMode = false,
  initialData = null,
}) {
  const fieldUpdateConfig = {
    shouldValidate: true,
    shouldDirty: true,
    shouldTouch: true,
  };
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues:
      editMode && initialData
        ? {
            type: initialData.type,
            amount: initialData.amount.toString(),
            description: initialData.description,
            accountId: initialData.accountId,
            category: initialData.category,
            date: new Date(initialData.date),
            isRecurring: initialData.isRecurring,
            ...(initialData.recurringInterval && {
              recurringInterval: initialData.recurringInterval,
            }),
          }
        : {
            type: "EXPENSE",
            amount: "",
            description: "",
            accountId: accounts.find((ac) => ac.isDefault)?.id,
            date: new Date(),
            isRecurring: false,
          },
  });

  const {
    loading: transactionLoading,
    fn: transactionFn,
  } = useFetch(editMode ? updateTransaction : createTransaction);

  const onSubmit = async (data) => {
    const formData = {
      ...data,
      amount: parseFloat(data.amount),
    };

    const result = editMode
      ? await transactionFn(editId, formData)
      : await transactionFn(formData);

    if (result?.success) {
      toast.success(
        editMode
          ? "Transaction updated successfully"
          : "Transaction created successfully"
      );
      const alert = result.budgetAlert;
      if (alert?.sent) {
        toast.success(`Budget alert email sent to ${alert.email}`);
      } else if (alert?.skipped === "email failed") {
        toast.error(
          typeof alert.error === "string"
            ? `Budget alert email failed: ${alert.error}`
            : "Budget alert email failed. Add GMAIL_USER + GMAIL_APP_PASSWORD to .env (no Resend needed)."
        );
      }
      reset();
      router.push(`/account/${result.data.accountId}`);
    }
  };

  const handleScanComplete = (scannedData) => {
    if (scannedData) {
      const totalPrice = scannedData.totalPrice ?? scannedData.amount;
      setValue("amount", totalPrice.toString(), fieldUpdateConfig);
      setValue("date", new Date(scannedData.date), fieldUpdateConfig);
      const detectedItem =
        scannedData.item ||
        (Array.isArray(scannedData.items) ? scannedData.items[0] : "") ||
        scannedData.description;
      if (detectedItem) {
        setValue("description", detectedItem, fieldUpdateConfig);
      }
      if (scannedData.category) {
        setValue("category", scannedData.category, fieldUpdateConfig);
      }
      toast.success("Receipt scanned: item and total price filled");
    }
  };

  const type = useWatch({ control, name: "type" });
  const isRecurring = useWatch({ control, name: "isRecurring" });
  const date = useWatch({ control, name: "date" });
  const accountId = useWatch({ control, name: "accountId" });
  const category = useWatch({ control, name: "category" });
  const recurringInterval = useWatch({ control, name: "recurringInterval" });

  const filteredCategories = categories.filter(
    (category) => category.type === type
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

      {/* Type */}
      <div className="space-y-2">
        <label htmlFor="transaction-type" className="text-sm font-medium text-foreground">
          Type
        </label>
        <Select
          onValueChange={(value) =>
            setValue("type", value, fieldUpdateConfig)
          }
          value={type ?? "EXPENSE"}
        >
          <SelectTrigger
            id="transaction-type"
            className="w-full bg-background border-border text-foreground"
          >
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Amount + Account */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="transaction-amount" className="text-sm font-medium text-foreground">
            Amount
          </label>
          <Input
            id="transaction-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="transaction-account" className="text-sm font-medium text-foreground">
            Account
          </label>
          <Select
            onValueChange={(value) =>
              setValue("accountId", value, fieldUpdateConfig)
            }
            value={accountId ?? undefined}
          >
            <SelectTrigger
              id="transaction-account"
              className="w-full bg-background border-border text-foreground"
            >
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} (₹{parseFloat(account.balance).toFixed(2)})
                </SelectItem>
              ))}
              <CreateAccountDrawer>
                <Button
                  variant="ghost"
                  className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  Create Account
                </Button>
              </CreateAccountDrawer>
            </SelectContent>
          </Select>
          {errors.accountId && (
            <p className="text-sm text-red-500">{errors.accountId.message}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label htmlFor="transaction-category" className="text-sm font-medium text-foreground">
          Category
        </label>
        <Select
          onValueChange={(value) =>
            setValue("category", value, fieldUpdateConfig)
          }
          value={category ?? undefined}
        >
          <SelectTrigger
            id="transaction-category"
            className="w-full bg-background border-border text-foreground"
          >
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label htmlFor="transaction-date" className="text-sm font-medium text-foreground">
          Date
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="transaction-date"
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal bg-background border-border text-foreground hover:bg-accent",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(nextDate) => {
                if (!nextDate) return;
                setValue("date", nextDate, fieldUpdateConfig);
              }}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="transaction-description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <Input
          id="transaction-description"
          placeholder="Enter description"
          className="bg-background border-border text-foreground placeholder:text-muted-foreground"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Recurring */}
      <div className="flex flex-row items-center justify-between rounded-lg border border-border bg-background p-4">
        <div className="space-y-0.5">
          <label className="text-base font-medium text-foreground">
            Recurring Transaction
          </label>
          <div className="text-sm text-muted-foreground">
            Set up a recurring schedule
          </div>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={(checked) =>
            setValue("isRecurring", checked, fieldUpdateConfig)
          }
        />
      </div>

      {isRecurring && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Recurring Interval
          </label>
          <Select
            onValueChange={(value) =>
              setValue("recurringInterval", value, fieldUpdateConfig)
            }
            value={recurringInterval ?? undefined}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {errors.recurringInterval && (
            <p className="text-sm text-red-500">
              {errors.recurringInterval.message}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-1/2 border-border text-foreground hover:bg-accent"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-1/2"
          disabled={transactionLoading}
        >
          {transactionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Creating..."}
            </>
          ) : editMode ? (
            "Update Transaction"
          ) : (
            "Create Transaction"
          )}
        </Button>
      </div>
    </form>
  );
}