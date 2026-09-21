"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useWallet } from "@/components/WalletProvider";

const NAV = [
  { label: "PAPERS", href: "/papers" },
  { label: "NETWORK", href: "/network" },
  { label: "CONSOLE", href: "/console" },
  { label: "FAQ", href: "/faq" },
  { label: "DOCS", href: "/docs" },
];

export default function SiteHeader({ active }: { active?: string }) {
  const { address, chainId, isCorrectChain, connect, disconnect, switchToBaseSepolia } = useWallet();

  return (
    <header className="site-header">
      <Link href="/" style={{ textDecoration: "none" }}>
        <Logo fontSize={24} />
      </Link>

      <nav className="mono">
        {NAV.map((item) =>
          item.href.startsWith("/") ? (
            <Link
              key={item.label}
              href={item.href}
              className="link"
              style={
                active === item.label
                  ? { color: "#fff", textDecoration: "none" }
                  : undefined
              }
            >
              {item.label}
            </Link>
          ) : (
            <a key={item.label} href={item.href} className="link">
              {item.label}
            </a>
          )
        )}
      </nav>

      {address ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: isCorrectChain ? "#6f6" : "#fa6", border: `1px solid ${isCorrectChain ? "#2a4" : "#a50"}`, padding: "4px 8px" }}>
            {chainId ? `84532 ${isCorrectChain ? "✓" : "→ SWITCH"}` : "…"}
          </span>
          <button
            onClick={() => (isCorrectChain ? disconnect() : switchToBaseSepolia())}
            className="btn-outline mono"
            style={{
              background: isCorrectChain ? "transparent" : "#1a1a00",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.12em",
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={isCorrectChain ? "Disconnect" : "Switch to Base Sepolia 84532"}
          >
            {isCorrectChain ? `${address.slice(0, 6)}…${address.slice(-4)}` : "SWITCH TO 84532"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => void connect()}
          className="btn-outline mono"
          style={{
            background: "transparent",
            cursor: "pointer",
            fontSize: 11,
            letterSpacing: "0.14em",
          }}
        >
          CONNECT WALLET
        </button>
      )}
    </header>
  );
}
