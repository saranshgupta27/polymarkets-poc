import { StoreProvider } from "@/store/StoreProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prediction Market Aggregator",
  description:
    "Real-time prediction market aggregator combining Polymarket and Kalshi order books",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950`}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
