import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ClosaiProvider } from "@/components/closai-context";
import { Header } from "@/components/Header";
import { STORE } from "@/lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: `${STORE.name} × Closai`, template: "%s" },
  description: "A mock retailer storefront showing what Closai can do when it knows what the shopper already owns.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ClosaiProvider>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-24">{children}</main>
          <footer className="border-t border-neutral-200 py-8 text-center text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            Demo storefront · Mock inventory · Closai retail partner exercise
          </footer>
        </ClosaiProvider>
      </body>
    </html>
  );
}
