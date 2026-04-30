import React from "react";
import Image from "next/image";
import { Show, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "./ui/button";
import { LayoutDashboard, PenBox } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { checkUser } from "@/lib/checkUser";
import { UserButtonClient } from "@/components/user-button-client";

const Header =async () => {
  await checkUser();
  return (
    <header className="fixed top-0 w-full h-20 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors duration-300">
      <nav className="container mx-auto px-4 h-full flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/">
          {/* Light mode logo */}
          <Image
            src="/logo.png"
            alt="wealth logo"
            height={700}
            width={700}
            className="h-12 w-36 object-contain block dark:hidden"
          />
          {/* Dark mode logo */}
          <Image
            src="/dark_logo.png"
            alt="wealth logo"
            height={700}
            width={700}
            className="h-16 w-48 object-contain hidden dark:block"
          />
        </Link>

        {/* Right Side */}
        <div className="flex items-center space-x-4">

          {/* Dark Mode Toggle */}
          <ModeToggle />

          <Show when="signed-in">
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <LayoutDashboard size={18} />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>

            <Link href="/transaction/create">
              <Button className="flex items-center gap-2">
                <PenBox size={18} />
                <span className="hidden md:inline">Add Transaction</span>
              </Button>
            </Link>
          </Show>

          <Show when="signed-out">
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline">Login</Button>
            </SignInButton>
          </Show>

          <Show when="signed-in">
            <UserButtonClient
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </Show>

        </div>
      </nav>
    </header>
  );
};

export default Header;