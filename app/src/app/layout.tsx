import type { Metadata } from "next";
import { Source_Serif_4, Courier_Prime } from "next/font/google";
import { WalletProvider } from "@/components/WalletProvider";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "RAAC — Trustless Research Review Network",
  description:
    "ERC-8004 agent network for research paper peer review on Base Sepolia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSerif.variable} ${courierPrime.variable}`}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
