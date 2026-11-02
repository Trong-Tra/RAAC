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
  status === "completed" ? "STEP 5 — REVIEWS" : status === "reviewing" ? "STEP 4 — RUNNING" : status === "council_proposed" ? "STEP 3 — SIGN" : "STEP 2 — COUNCIL";

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
        eyebrow="CONSOLE — PAPERS"
        title="Your papers."
        sub={address ? `Signed by ${address.slice(0, 6)}…${address.slice(-4)} on 84532 — each wallet manages its own.` : "Connect a wallet — each wallet manages its own papers."}
      />

      {msg && <div className="mono" style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.08em", color: "#8a8a8a" }}>{msg}</div>}

      <div style={{ marginTop: 18 }}>
        <Panel title={`WALLET PAPERS — ${mine.length}`}>
          {!papers ? (
            <div className="mono" style={{ fontSize: 11, color: "#5a5a5a", letterSpacing: "0.12em" }}>LOADING…</div>
          ) : mine.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8a8a8a" }}>
              No papers signed by this wallet yet.{" "}
              <Link href="/console" className="mono" style={{ color: "#e8e8e8", fontSize: 11, letterSpacing: "0.12em" }}>
                SUBMIT ONE IN OVERVIEW →
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {mine.map((p) => (
                <div key={p.id} style={{ border: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px", display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e8e8", lineHeight: 1.4 }}>{p.title}</div>
                  <div className="mono" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 9, letterSpacing: "0.1em", color: "#5a5a5a" }}>
                    <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px", color: "#c9c9c9" }}>{p.status.toUpperCase()}</span>
                    <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px" }}>{p.domain.toUpperCase()}</span>
                    <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px" }}>{stepLabel(p.status)}</span>
                    <span style={{ padding: "4px 0" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/console?paper=${p.id}`} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", textDecoration: "none" }}>
                      LOAD IN PIPELINE →
                    </Link>
                    <Link href={`/papers/${p.id}`} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", textDecoration: "none" }}>
                      OPEN →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mono" style={{ marginTop: 18, fontSize: 9.5, letterSpacing: "0.12em", color: "#3f3f3f" }}>
        GLOBAL SHOWCASE LIVES IN /PAPERS — THIS TAB IS YOUR WALLET ONLY.
      </div>
    </div>
  );
}
