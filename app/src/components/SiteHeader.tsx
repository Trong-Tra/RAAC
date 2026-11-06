"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useWallet } from "@/components/WalletProvider";

const NAV = [
  { label: "Console", href: "/console", key: "CONSOLE" },
  { label: "Catalogue", href: "/catalogue", key: "CATALOGUE" },
  { label: "Network", href: "/network", key: "NETWORK" },
  { label: "FAQ", href: "/faq", key: "FAQ" },
];

export default function SiteHeader({ active }: { active?: string }) {
  const { address, chainId, isCorrectChain, connect, disconnect, switchToBaseSepolia } = useWallet();

  return (
    <header className="site-header">
      <Link href="/" style={{ textDecoration: "none" }}>
        <Logo fontSize={22} />
      </Link>

      <nav>
        {NAV.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="link"
            style={
              active === item.key
                ? { color: "var(--vermilion)", fontWeight: 700 }
                : undefined
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {address ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: isCorrectChain ? "var(--emerald)" : "var(--chrome)",
              border: `1px solid ${isCorrectChain ? "var(--emerald)" : "var(--chrome)"}`,
              padding: "0 12px",
              minWidth: 124,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            {chainId ? `Chain ${chainId}` : "Chain …"}
          </span>
          <button
            onClick={() => (isCorrectChain ? disconnect() : switchToBaseSepolia())}
            className="btn-outline"
            style={{
              cursor: "pointer",
              fontSize: 13,
              letterSpacing: "0.12em",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              height: 36,
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
            title={isCorrectChain ? "Disconnect" : "Switch to Base Sepolia 84532"}
          >
            {isCorrectChain ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Switch to 84532"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => void connect()}
          className="btn-outline"
          style={{
            cursor: "pointer",
            fontSize: 13,
            letterSpacing: "0.14em",
            height: 36,
            padding: "0 14px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          Connect wallet
        </button>
      )}
    </header>
  );
}
