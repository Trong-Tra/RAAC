"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Plate from "@/components/Plate";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useWallet } from "@/components/WalletProvider";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { address, connect } = useWallet();
  const [paperCount, setPaperCount] = useState<string | undefined>(undefined);

  // Wallet paper count for the PAPERS badge — per-wallet management at a glance.
  useEffect(() => {
    if (!address) {
      setPaperCount(undefined);
      return;
    }
    fetch("/api/papers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        const n = (j.data as Array<{ authorAddress: string }>).filter(
          (p) => p.authorAddress.toLowerCase() === address.toLowerCase(),
        ).length;
        setPaperCount(String(n));
      })
      .catch(() => {});
  }, [address, pathname]);

  const ITEMS: Array<{ label: string; href: string; badge?: string }> = [
    { label: "Papers", href: "/console/papers", badge: paperCount },
    { label: "Audit", href: "/console/audit" },
    { label: "System", href: "/console/settings" },
  ];

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader active="CONSOLE" />

      {!address ? (
        <div
          className="section-pad"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plate caption="The console — locked" style={{ width: "min(480px, 100%)" }}>
            <div style={{ padding: "14px 10px 18px", textAlign: "center" }}>
              <p className="orn" aria-hidden>✦</p>
              <h1
                style={{
                  marginTop: 14,
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                }}
              >
                Connect to enter the console.
              </h1>
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14.5,
                  lineHeight: 1.65,
                  color: "var(--ink-soft)",
                }}
              >
                The console holds your wallet’s papers, the audit trace, and
                system reference on Base Sepolia 84532. The guided journey
                lives in <Link href="/app">the app</Link>.
              </p>
              <button
                onClick={connect}
                className="btn-action"
                style={{ marginTop: 22 }}
              >
                Connect wallet
              </button>
            </div>
          </Plate>
        </div>
      ) : (
        <div className="section-pad page-measure console-wrap" style={{ width: "100%" }}>
          <nav className="console-nav" aria-label="Console sections">
            {ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="sc"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderLeft: active ? "2px solid var(--vermilion)" : "2px solid transparent",
                    color: active ? "var(--vermilion)" : "var(--ink-soft)",
                    fontWeight: active ? 700 : 400,
                    textDecoration: "none",
                    fontSize: 13.5,
                  }}
                >
                  {item.label}
                  {item.badge && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        border: "1px solid var(--rule-soft)",
                        padding: "1px 7px",
                        color: "var(--ink-soft)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="console-body">{children}</div>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
