import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

/** Resolve the user's email (DB first, then Clerk login email) and keep DB in sync. */
export async function resolveUserEmail(user) {
  if (!user) return null;

  if (user.email) return user.email;

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(user.clerkUserId);
    const primaryId = clerkUser.primaryEmailAddressId;
    const email =
      clerkUser.emailAddresses.find((e) => e.id === primaryId)?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress;

    if (email) {
      await db.user.update({
        where: { id: user.id },
        data: { email },
      });
      return email;
    }
  } catch (err) {
    console.warn("Could not resolve email from Clerk:", err?.message);
  }

  return null;
}
