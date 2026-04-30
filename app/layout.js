import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

import AIChatbot from "@/components/ai-chatbot";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.className} bg-white dark:bg-black text-black dark:text-white transition-colors duration-300`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <Header />
            <main className="min-h-screen pt-20 px-4 text-black dark:text-white">{children}</main>
            <Toaster richColors />
            <AIChatbot />

            <footer className="bg-blue-50 dark:bg-gray-900">
              <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-300">
                <p>Made with ❤️ by Sanyukta Sardar & Taniisha Chakraborty</p>
              </div>
            </footer>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}