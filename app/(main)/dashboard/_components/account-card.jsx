"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import useFetch from '@/hooks/use-fetch';
import { updateDefaultAccount } from '@/actions/dashboard';
import { toast } from 'sonner';

const AccountCard = ({ account }) => {
  const { name, type, balance, id, isDefault } = account;

  const { loading, fn: setDefault } = useFetch(updateDefaultAccount);

  const handleDefaultChange = async (e) => {
    e.preventDefault();
    if (isDefault) {
      toast.warning("You need at least one default account");
      return;
    }
    await setDefault(id);
    toast.success(`${name} set as default account`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group relative">
      <CardContent className="p-4">
        {/* Top row: name + switch */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {name}
          </span>
          <Switch
            checked={isDefault}
            onClick={handleDefaultChange}
            disabled={loading}
            className="shrink-0"
          />
        </div>

        {/* Balance */}
        <Link href={`/account/${id}`}>
          <div className="mb-1">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ₹{parseFloat(balance).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {type.charAt(0) + type.slice(1).toLowerCase()} Account
            </p>
          </div>

          {/* Bottom row: Income + Expense */}
          <div className="flex justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Income
            </div>
            <div className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <ArrowDownRight className="h-3.5 w-3.5" />
              Expense
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
};

export default AccountCard;
