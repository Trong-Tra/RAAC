"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MacWindow from "@/components/MacWindow";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

type Paper = {
  id: string;
  title: string;
  abstract: string;
  domain: string;
  keywords: string[];
  paperHash: string;
  status: string;
  authorAddress: string;
  feeAmountWei: string | null;
  createdAt: string;
};

function shortHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/papers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message ?? "load failed");
        setPapers(j.data);
      })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <main style={{ minHeight: "100dvh", background: "#000", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="PAPERS" />

      <div className="section-pad" style={{ paddingBottom: 0 }}>
        <p className="mono" style={{ fontSize: 11, letterSpacing: "0.2em", color: "#5a5a5a" }}>
          RAAC — PAPERS
        </p>
        <h1 style={{ marginTop: 18, fontSize: "clamp(34px, 4.5vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#f4f4f4" }}>
          One paper. Peer reviews.
        </h1>
        <p style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.65, color: "#8a8a8a", maxWidth: 680 }}>
          Submit a paper on Base Sepolia, pay the fee, sign the council — five domain-qualified agents discuss then write independently. Routing, Accountability, Auditable Councils.
        </p>
        <p className="mono" style={{ marginTop: 14, fontSize: 9.5, letterSpacing: "0.16em", color: "#3f3f3f" }}>
          BASE SEPOLIA 84532 · HASHES ON-CHAIN · CONTENT OFF-CHAIN
        </p>
        <p className="mono" style={{ marginTop: 12, fontSize: 9.5, letterSpacing: "0.12em", color: "#3f3f3f" }}>SUBMIT → CONSOLE (WALLET REQUIRED) — global is read-only</p>
      </div>

      <div className="section-pad">
        {err ? (
          <MacWindow title="PAPERS — ERROR">
            <div style={{ padding: "26px 24px 28px", color: "#8a8a8a", fontSize: 14 }}>{err}</div>
          </MacWindow>
        ) : !papers ? (
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "#3f3f3f" }}>LOADING PAPERS…</div>
        ) : papers.length === 0 ? (
          <MacWindow title="PAPERS — EMPTY (GLOBAL)">
            <div style={{ padding: "26px 24px 28px", color: "#8a8a8a", fontSize: 14 }}>
              No papers yet — submit an arXiv via <span className="mono" style={{ color: "#c9c9c9" }}>/console</span> (connect wallet).
            </div>
          </MacWindow>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {papers.map((p) => (
              <MacWindow key={p.id} title={`PAPER — ${p.domain.toUpperCase()} · ${p.status.toUpperCase()} — GLOBAL (ANONYMIZED)`}>
                <div style={{ padding: "24px 24px 22px" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#e8e8e8", lineHeight: 1.35 }}>
                    {p.title}
                  </div>
                  <div className="mono" style={{ marginTop: 10, fontSize: 10, letterSpacing: "0.14em", color: "#5a5a5a" }}>
                    {shortHash(p.paperHash)} · {p.domain.toUpperCase()} · {new Date(p.createdAt).toLocaleDateString()} · GLOBAL
                  </div>
                  <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "#5a5a5a", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    Abstract redacted on global surface — hashes and domain only. Full content is private to author wallet.
                  </p>
                  <div className="mono" style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 9.5, letterSpacing: "0.12em" }}>
                    <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px", color: "#c9c9c9" }}>{p.status.toUpperCase()}</span>
                    <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px", color: "#8a8a8a" }}>{p.domain.toUpperCase()}</span>
                    <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px", color: "#5a5a5a" }}>{shortHash(p.paperHash)} · GLOBAL HASH</span>
                  </div>
                  <div className="mono" style={{ marginTop: 12, fontSize: 9, letterSpacing: "0.1em", color: "#3f3f3f" }}>PRIVATE DETAILS → CONSOLE WITH WALLET (author-tied) — not linked from global</div>
                </div>
              </MacWindow>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
            ← LANDING
          </Link>
          <Link href="/network" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
            VIEW NETWORK →
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
