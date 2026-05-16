import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "arXiom | Human Problem Registry",
  description:
    "Register scientific and computational problems on Kite AI for autonomous AI solvers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
