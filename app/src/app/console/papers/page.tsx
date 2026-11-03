"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/ConsoleBits";
import { useWallet } from "@/components/WalletProvider";

type Paper = {
  id: string;
  title: string;
  domain: string;
  status: string;
  paperHash: string;
  authorAddress: string;
  createdAt: string;
};

const stepLabel = (status: string) =>
  status === "completed" ? "reports written" : status === "reviewing" ? "council in session" : status === "council_proposed" ? "awaiting signature" : "awaiting council";

export default function ConsolePapers() {
  const { address } = useWallet();
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/papers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message);
        setPapers(j.data as Paper[]);
      })
      .catch((e) => setMsg(e.message));
  }, []);

  const mine = address && papers ? papers.filter((p) => p.authorAddress.toLowerCase() === address.toLowerCase()) : [];

  return (
    <div>
      <PageHead
        title="Your papers."
        sub={address ? `Signed by ${address.slice(0, 6)}…${address.slice(-4)} on 84532 — each wallet manages its own.` : "Connect a wallet — each wallet manages its own papers."}
      />

      {msg && <p className="mono" style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.08em", color: "var(--madder)" }}>{msg}</p>}

      <div style={{ marginTop: 22 }}>
        <Panel title={`Wallet papers — ${mine.length}`}>
          {!papers ? (
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.12em" }}>Opening the register…</div>
          ) : mine.length === 0 ? (
            <p style={{ fontSize: 14.5, color: "var(--ink-soft)" }}>
              No papers signed by this wallet yet.{" "}
              <Link href="/app" className="sc" style={{ fontSize: 13, color: "var(--vermilion-deep)" }}>
                Submit one in the app →
              </Link>
            </p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {mine.map((p) => (
                <div key={p.id} style={{ borderTop: "1px solid var(--rule-faint)", paddingTop: 14, display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4 }}>{p.title}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="chip">{p.status.replace(/_/g, " ")}</span>
                    <span className="chip">{p.domain}</span>
                    <span className="sc" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{stepLabel(p.status)}</span>
                    <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/app?paper=${p.id}`} className="btn-outline" style={{ padding: "8px 14px", fontSize: 10 }}>
                      Open in the journey →
                    </Link>
                    <Link href={`/papers/${p.id}`} className="btn-outline" style={{ padding: "8px 14px", fontSize: 10 }}>
                      Read reports →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <p className="mono" style={{ marginTop: 18, fontSize: 9.5, letterSpacing: "0.12em", color: "var(--ink-faint)" }}>
        The public showcase lives in /network — this register is your wallet only.
      </p>
    </div>
  );
}
