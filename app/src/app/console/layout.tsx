"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MacWindow from "@/components/MacWindow";
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

  const ITEMS: Array<{ label: string; href: string; badge?: string }> = [
    { label: "OVERVIEW", href: "/console" },
    { label: "AUDIT", href: "/console/audit" },
    { label: "SETTINGS", href: "/console/settings" },
  ];

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#000",
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
          <MacWindow title="CONSOLE — LOCKED" style={{ width: "min(480px, 100%)" }}>
            <div style={{ padding: "38px 34px 42px", textAlign: "center" }}>
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 34,
                  height: 34,
                  border: "1px solid #5a5a5a",
                  position: "relative",
                }}
              />
              <h1
                style={{
                  marginTop: 22,
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "#f4f4f4",
                }}
              >
                Connect to enter the console.
              </h1>
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "#8a8a8a",
                }}
              >
                The console is your RAAC dashboard — papers, councils,
                agents, and audit on Base Sepolia 84532. Connect a wallet
                (demo).
              </p>
              <button
                onClick={connect}
                className="btn-outline mono"
                style={{
                  marginTop: 26,
                  background: "#f4f4f4",
                  borderColor: "#f4f4f4",
                  color: "#000",
                  cursor: "pointer",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                }}
              >
                CONNECT WALLET
              </button>
            </div>
          </MacWindow>
        </div>
      ) : (
        <div className="section-pad console-wrap">
          <nav className="mono console-nav" aria-label="Console sections">
            {ITEMS.map((item) => {
              const active =
                item.href === "/console"
                  ? pathname === "/console"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    border: active
                      ? "1px solid #e8e8e8"
                      : "1px solid transparent",
                    borderRadius: 8,
                    color: active ? "#fff" : "#8a8a8a",
                    textDecoration: "none",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                  }}
                >
                  {item.label}
                  {item.badge && (
                    <span
                      style={{
                        fontSize: 10,
                        border: "1px solid #3a3a3a",
                        borderRadius: 4,
                        padding: "2px 7px",
                        color: "#e8e8e8",
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
