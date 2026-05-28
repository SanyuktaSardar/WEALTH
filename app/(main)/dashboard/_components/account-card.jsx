"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { updateDefaultAccount, deleteAccount, updateAccountBalance } from "@/actions/account";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

export function AccountCard({ account }) {
  const { name, type, balance, id, isDefault } = account;

  // ── Default toggle ──────────────────────────────────────────────────────────
  const {
    loading: defaultLoading,
    fn: updateDefaultFn,
    data: updatedDefault,
    error: defaultError,
  } = useFetch(updateDefaultAccount);

  const handleDefaultChange = async (e) => {
    e.preventDefault();
    if (isDefault) {
      toast.warning("You need at least 1 default account");
      return;
    }
    await updateDefaultFn(id);
  };

  useEffect(() => {
    if (updatedDefault?.success) toast.success("Default account updated");
  }, [updatedDefault]);

  useEffect(() => {
    if (defaultError) toast.error(defaultError.message || "Failed to update default");
  }, [defaultError]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    loading: deleteLoading,
    fn: deleteFn,
    data: deleteResult,
    error: deleteError,
  } = useFetch(deleteAccount);

  const handleDelete = async () => {
    await deleteFn(id);
  };

  useEffect(() => {
    if (deleteResult?.success) {
      toast.success("Account deleted successfully");
      setShowDeleteDialog(false);
    }
    if (deleteResult?.error) {
      toast.error(deleteResult.error);
      setShowDeleteDialog(false);
    }
  }, [deleteResult]);

  useEffect(() => {
    if (deleteError) toast.error(deleteError.message || "Failed to delete account");
  }, [deleteError]);

  // ── Edit balance ────────────────────────────────────────────────────────────
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newBalance, setNewBalance] = useState(parseFloat(balance).toFixed(2));

  const {
    loading: editLoading,
    fn: editBalanceFn,
    data: editResult,
    error: editError,
  } = useFetch(updateAccountBalance);

  const handleEditBalance = async () => {
    const val = parseFloat(newBalance);
    if (isNaN(val) || val < 0) {
      toast.error("Please enter a valid balance");
      return;
    }
    await editBalanceFn(id, val);
  };

  useEffect(() => {
    if (editResult?.success) {
      toast.success("Balance updated successfully");
      setShowEditDialog(false);
    }
    if (editResult?.error) {
      toast.error(editResult.error);
    }
  }, [editResult]);

  useEffect(() => {
    if (editError) toast.error(editError.message || "Failed to update balance");
  }, [editError]);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow relative">
        {/* Three-dot menu — top-right corner, outside the Link */}
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.preventDefault()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setNewBalance(parseFloat(balance).toFixed(2));
                  setShowEditDialog(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Balance
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteDialog(true);
                }}
                disabled={isDefault}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDefault ? "Can't delete default" : "Delete Account"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link href={`/account/${id}`} className="block group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-10">
            <CardTitle className="text-sm font-medium capitalize">{name}</CardTitle>
            <Switch
              checked={isDefault}
              onClick={handleDefaultChange}
              disabled={defaultLoading}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{parseFloat(balance).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {type.charAt(0) + type.slice(1).toLowerCase()} Account
            </p>
          </CardContent>
          <CardFooter className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              Income
            </div>
            <div className="flex items-center">
              <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
              Expense
            </div>
          </CardFooter>
        </Link>
      </Card>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account and all its transactions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Edit balance dialog ────────────────────────────────────────────── */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Balance — {name}</AlertDialogTitle>
            <AlertDialogDescription>
              Set the current balance for this account. This directly updates
              the balance without creating a transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              placeholder="Enter new balance"
              disabled={editLoading}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditBalance}
              disabled={editLoading}
            >
              {editLoading ? "Saving..." : "Save Balance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
