"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MacWindow from "@/components/MacWindow";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useWallet } from "@/components/WalletProvider";

const DOMAINS = ["cryptography", "ml", "biology", "economics", "systems"] as const;

export default function NewPaperPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>("cryptography");
  const [keywords, setKeywords] = useState("zero-knowledge, federated learning");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (title.trim().length < 5) { setErr("Title >= 5 chars"); return; }
    if (abstract.trim().length < 20) { setErr("Abstract >= 20 chars"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          abstract: abstract.trim(),
          domain,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
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
        <p className="mono" style={{ marginTop: 18, fontSize: 11, letterSpacing: "0.2em", color: "#5a5a5a" }}>RAAC — NEW PAPER</p>
        <h1 style={{ marginTop: 18, fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, color: "#f4f4f4", maxWidth: 720 }}>
          Submit a paper. Get 5 reviews.
        </h1>
        <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.65, color: "#8a8a8a", maxWidth: 680 }}>
          Stored off-chain, hash on Base Sepolia 84532. Fee is 0.001 ETH demo (or your tx hash). Routing is deterministic via Graph; council is EIP-712 gated.
        </p>
        {!address && (
          <div className="mono" style={{ marginTop: 14, fontSize: 10, letterSpacing: "0.12em", color: "#8a8a8a", border: "1px dashed #2a2a2a", padding: "10px 14px", display: "inline-block" }}>
            CONNECT WALLET TO SUBMIT AS YOUR ADDRESS — else author is 0xDead (demo)
          </div>
        )}
      </div>

      <div className="section-pad" style={{ maxWidth: 760 }}>
        <MacWindow title="NEW PAPER — 84532">
          <div style={{ padding: "26px 24px 28px", display: "grid", gap: 18 }}>
            <label className="mono" style={{ display: "grid", gap: 8, fontSize: 11, letterSpacing: "0.12em", color: "#8a8a8a" }}>
              TITLE
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Zero-knowledge proofs for federated inference" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "12px 14px", fontSize: 14, outline: "none" }} />
            </label>

            <label className="mono" style={{ display: "grid", gap: 8, fontSize: 11, letterSpacing: "0.12em", color: "#8a8a8a" }}>
              ABSTRACT
              <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={5} placeholder="We present a ZK system for verifying federated inference…" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "12px 14px", fontSize: 14, lineHeight: 1.5, outline: "none", resize: "vertical" }} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <label className="mono" style={{ display: "grid", gap: 8, fontSize: 11, letterSpacing: "0.12em", color: "#8a8a8a" }}>
                DOMAIN
                <select value={domain} onChange={(e) => setDomain(e.target.value as never)} style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "12px 14px", fontSize: 13, outline: "none" }}>
                  {DOMAINS.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </label>
              <label className="mono" style={{ display: "grid", gap: 8, fontSize: 11, letterSpacing: "0.12em", color: "#8a8a8a" }}>
                KEYWORDS (comma)
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="zero-knowledge, federated" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "12px 14px", fontSize: 13, outline: "none" }} />
              </label>
            </div>

            {err && <div className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "#ff6b6b", border: "1px solid #3a2a2a", padding: "10px 12px" }}>{err}</div>}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={submit} disabled={busy} className="mono" style={{ padding: "12px 22px", background: "#f4f4f4", color: "#000", border: "1px solid #f4f4f4", fontSize: 11, letterSpacing: "0.14em", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "SUBMITTING…" : "SUBMIT → 84532"}
              </button>
              <Link href="/papers" className="mono btn-outline" style={{ padding: "12px 22px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>CANCEL</Link>
            </div>

            <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "#3f3f3f" }}>
              HASH = sha256(title|abstract|now) → paperHash on 84532 · FEE 0.001 ETH demo (override via API feeTxHash) · AUTHOR {address ? address.slice(0, 10) + "…" : "0xDead (demo)"}
            </div>
          </div>
        </MacWindow>
      </div>

      <SiteFooter />
    </main>
  );
}
