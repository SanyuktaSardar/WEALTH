"use client";

import { UserButton } from "@clerk/nextjs";
import useIsClient from "@/hooks/use-is-client";

export function UserButtonClient({ appearance }) {
  const isClient = useIsClient();

  if (!isClient) {
    // Render a placeholder with the same dimensions to avoid layout shift
    return <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />;
  }

  return <UserButton appearance={appearance} />;
}
