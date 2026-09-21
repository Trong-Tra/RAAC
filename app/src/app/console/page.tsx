"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Panel, StatRow } from "@/components/ConsoleBits";
import { useWallet } from "@/components/WalletProvider";
import { RAAC_DOMAIN, RAAC_TYPES } from "@/lib/council-message";

type Paper = {
  id: string;
  title: string;
  domain: string;
  status: string;
  paperHash: string;
  createdAt: string;
};

function shortHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export default function ConsoleOverview() {
  const { address } = useWallet();
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [stats, setStats] = useState<{ papers_submitted: number; councils_formed: number; reviews_submitted: number; reviews_anchored: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    fetch("/api/papers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message);
        setPapers(j.data);
      })
      .catch((e) => setMsg(e.message));
  };

  useEffect(() => {
    load();
    fetch("/api/network/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setStats(j.data); })
      .catch(() => {});
  }, []);

  const propose = async (id: string) => {
    setBusy(id);
    setMsg(null);
    try {
      const r = await fetch(`/api/papers/${id}/selection`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`PROPOSED ${j.data.council.id.slice(0, 8)} → 84532`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const sign = async (paper: Paper) => {
    if (!address) {
      setMsg("CONNECT WALLET FIRST — 84532");
      return;
    }
    // need council + paperHash
    const detail = await fetch(`/api/papers/${paper.id}`, { cache: "no-store" }).then((r) => r.json());
    if (!detail.ok) {
      setMsg(detail.error?.message);
      return;
    }
    const council = detail.data.council;
    if (!council) {
      setMsg("PROPOSE FIRST");
      return;
    }
    setBusy(paper.id);
    setMsg(null);
    try {
      const anyWindow = window as unknown as { ethereum?: { request: (a: unknown) => Promise<string> } };
      if (!anyWindow.ethereum) throw new Error("No injected wallet — switch to Base Sepolia 84532");
      const typedData = JSON.stringify({
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          ...RAAC_TYPES,
        },
        primaryType: "CouncilFormation",
        domain: RAAC_DOMAIN,
        message: { paperId: paper.id, paperHash: paper.paperHash, selectionHash: council.selectionHash, author: address },
      });
      const signature = await anyWindow.ethereum.request({ method: "eth_signTypedData_v4", params: [address, typedData] } as unknown as never) as string;
      const r = await fetch(`/api/papers/${paper.id}/council/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature, author: address }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`SIGNED ${j.data.council.id.slice(0, 8)} ACTIVE → 84532`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const run = async (id: string) => {
    setBusy(id);
    setMsg(null);
    try {
      const r = await fetch(`/api/papers/${id}/council/run`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`RAN ${j.data.reviews.length} REVIEWS → 84532`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy("reset");
    setMsg(null);
    try {
      const r = await fetch("/api/demo/seed", { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`RESET ${j.data.papers} paper(s) → 84532`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHead
        eyebrow="CONSOLE — RAAC DEMO"
        title="Papers → councils → reviews."
        sub="Demo environment inside the console — no separate demo page. Submit is seeded (zl-421), then propose → sign (84532) → run. All on Base Sepolia 84532. Routing · Accountability · Auditable Councils."
      />

      <StatRow
        stats={[
          { value: String(stats?.papers_submitted ?? papers?.length ?? "—"), label: "PAPERS" },
          { value: String(stats?.councils_formed ?? "—"), label: "COUNCILS" },
          { value: String(stats?.reviews_submitted ?? "—"), label: "REVIEWS" },
          { value: String(stats?.reviews_anchored ?? "—"), label: "ANCHORED" },
          { value: "5", label: "COUNCIL SIZE" },
          { value: "84532", label: "CHAIN" },
        ]}
      />

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={reset} disabled={busy === "reset"} className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: busy ? "wait" : "pointer", background: busy === "reset" ? "#111" : "transparent" }}>
          RESET DEMO (SEED)
        </button>
        <Link href="/papers" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
          OPEN /PAPERS →
        </Link>
        <Link href="/network" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
          NETWORK →
        </Link>
      </div>

      {msg && <div className="mono" style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.08em", color: msg.startsWith("SIGNED") || msg.startsWith("RAN") || msg.startsWith("PROPOSED") ? "#c9c9c9" : "#8a8a8a" }}>{msg}</div>}

      <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {!papers ? (
          <Panel title="PAPERS — LOADING"><div className="mono" style={{ fontSize: 11, color: "#5a5a5a", letterSpacing: "0.12em" }}>LOADING…</div></Panel>
        ) : papers.length === 0 ? (
          <Panel title="PAPERS — EMPTY"><div style={{ fontSize: 13, color: "#8a8a8a" }}>No papers — hit RESET DEMO.</div></Panel>
        ) : (
          papers.map((p) => (
            <Panel key={p.id} title={`${p.title.slice(0, 48)} — ${p.status.toUpperCase()} · ${p.domain.toUpperCase()}`}>
              <div style={{ display: "grid", gap: 12 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "#5a5a5a" }}>
                  {shortHash(p.paperHash)} · {new Date(p.createdAt).toLocaleDateString()} · {p.id.slice(0, 8)}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => propose(p.id)} disabled={busy === p.id} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", cursor: busy ? "wait" : "pointer" }}>
                    PROPOSE
                  </button>
                  <button onClick={() => sign(p)} disabled={busy === p.id} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", cursor: busy ? "wait" : "pointer" }}>
                    SIGN (84532)
                  </button>
                  <button onClick={() => run(p.id)} disabled={busy === p.id} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", cursor: busy ? "wait" : "pointer" }}>
                    RUN → 5 REVIEWS
                  </button>
                  <Link href={`/papers/${p.id}`} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", textDecoration: "none" }}>
                    OPEN →
                  </Link>
                </div>
              </div>
            </Panel>
          ))
        )}
      </div>

      <div className="mono" style={{ marginTop: 18, fontSize: 9.5, letterSpacing: "0.12em", color: "#3f3f3f" }}>
        FLOW: PROPOSE (agents.ranked → council.proposed) → SIGN (EIP-712 on 84532 → signature.verified → council.opened) → RUN (discussion.message×5 + review.submitted×5 + paper.completed) — all Base Sepolia 84532.
      </div>
    </div>
  );
}
