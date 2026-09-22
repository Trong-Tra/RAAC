"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MacWindow from "@/components/MacWindow";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useWallet } from "@/components/WalletProvider";

export default function NewPaperPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [arxivUrl, setArxivUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    const url = arxivUrl.trim();
    if (!url) { setErr("Paste an arXiv URL — e.g. https://arxiv.org/abs/1706.03762"); return; }
    if (!url.includes("arxiv.org") && !/^\d{4}\.\d{4,5}/.test(url)) { setErr("Invalid arXiv URL or ID"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          arxivUrl: url,
          authorAddress: address && /^0x[0-9a-fA-F]{40}$/.test(address) ? address : undefined,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message ?? "submit failed");
      router.push(`/papers/${j.data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: "100dvh", background: "#000", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="PAPERS" />

      <div className="section-pad" style={{ paddingBottom: 0 }}>
        <Link href="/papers" className="mono link" style={{ fontSize: 11, letterSpacing: "0.14em" }}>← PAPERS</Link>
        <p className="mono" style={{ marginTop: 18, fontSize: 11, letterSpacing: "0.2em", color: "#5a5a5a" }}>RAAC — NEW PAPER — ARXIV ONLY</p>
        <h1 style={{ marginTop: 18, fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, color: "#f4f4f4", maxWidth: 720 }}>
          Paste an arXiv link. Get 5 reviews.
        </h1>
        <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.65, color: "#8a8a8a", maxWidth: 680 }}>
          We fetch title, abstract, and categories from arXiv. No file upload, no 80-page chewing in Postgres. Council reads the full PDF directly from arXiv via the link — DB only stores the URL and hash on Base Sepolia 84532.
        </p>
        {!address && (
          <div className="mono" style={{ marginTop: 14, fontSize: 10, letterSpacing: "0.12em", color: "#8a8a8a", border: "1px dashed #2a2a2a", padding: "10px 14px", display: "inline-block" }}>
            CONNECT WALLET TO SUBMIT AS YOUR ADDRESS — else author is 0xDead (demo)
          </div>
        )}
      </div>

      <div className="section-pad" style={{ maxWidth: 760 }}>
        <MacWindow title="ARXIV URL → 84532">
          <div style={{ padding: "26px 24px 28px", display: "grid", gap: 18 }}>
            <label className="mono" style={{ display: "grid", gap: 8, fontSize: 11, letterSpacing: "0.12em", color: "#8a8a8a" }}>
              ARXIV URL OR ID
              <input value={arxivUrl} onChange={(e) => setArxivUrl(e.target.value)} placeholder="https://arxiv.org/abs/1706.03762 or 1706.03762" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "14px 16px", fontSize: 14, outline: "none" }} />
            </label>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", color: "#5a5a5a", lineHeight: 1.6 }}>
              Examples: <span style={{ color: "#8a8a8a" }}>2407.12345</span> · <span style={{ color: "#8a8a8a" }}>https://arxiv.org/abs/2305.19466</span> · <span style={{ color: "#8a8a8a" }}>https://arxiv.org/pdf/1706.03762v7</span> — we derive domain/keywords/taxonomy automatically.
            </div>

            {err && <div className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "#ff6b6b", border: "1px solid #3a2a2a", padding: "10px 12px" }}>{err}</div>}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={submit} disabled={busy} className="mono" style={{ padding: "12px 22px", background: "#f4f4f4", color: "#000", border: "1px solid #f4f4f4", fontSize: 11, letterSpacing: "0.14em", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "FETCHING ARXIV…" : "SUBMIT ARXIV → 84532"}
              </button>
              <Link href="/papers" className="mono btn-outline" style={{ padding: "12px 22px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>CANCEL</Link>
            </div>

            <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "#3f3f3f" }}>
              HASH = sha256(arxivId|title) → paperHash on 84532 · PDF stays on arXiv (council fetches via URL, DB never bloats) · FEE 0.001 ETH demo · AUTHOR {address ? address.slice(0, 10) + "…" : "0xDead (demo)"}
            </div>
          </div>
        </MacWindow>
      </div>

      <SiteFooter />
    </main>
  );
}
