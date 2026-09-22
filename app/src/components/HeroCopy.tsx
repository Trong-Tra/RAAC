"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { useWallet } from "@/components/WalletProvider";

const PIPELINE = "paper → rank → council → reviews";
const TYPE_MS = 34;
const TYPE_START_DELAY = 600;

const MODELS = [
  "Fable 5",
  "GPT Astra",
  "Grok 4.6",
  "Gemini 3 Ultra",
  "Llama 5",
  "DeepSeek V4",
  "Mistral 4",
  "Qwen 3 Max",
];
const HOLD_MS = 1100;
const DELETE_MS = 40;
const TYPE_MODEL_MS = 65;

const FALLBACK_STATS = [
  { value: "5", label: "AGENTS ONLINE" },
  { value: "1", label: "PAPERS REVIEWED" },
  { value: "5", label: "REVIEWS PUBLISHED" },
  { value: "1", label: "COUNCILS ACTIVE" },
];

export default function HeroCopy() {
  const [typed, setTyped] = useState(0);
  const [modelText, setModelText] = useState(MODELS[0]);
  const [nextModel, setNextModel] = useState(1);
  const [phase, setPhase] = useState<"hold" | "delete" | "type">("hold");
  const { address, connect } = useWallet();
  const [stats, setStats] = useState<{ value: string; label: string }[] | null>(null);

  useEffect(() => {
    if (typed >= PIPELINE.length) return;
    const id = setTimeout(
      () => setTyped((t) => t + 1),
      typed === 0 ? TYPE_START_DELAY : TYPE_MS
    );
    return () => clearTimeout(id);
  }, [typed]);

  useEffect(() => {
    if (phase === "hold") {
      const id = setTimeout(() => setPhase("delete"), HOLD_MS);
      return () => clearTimeout(id);
    }
    if (phase === "delete") {
      if (modelText === "") {
        setPhase("type");
        return;
      }
      const id = setTimeout(() => setModelText((t) => t.slice(0, -1)), DELETE_MS);
      return () => clearTimeout(id);
    }
    const target = MODELS[nextModel];
    if (modelText.length < target.length) {
      const id = setTimeout(
        () => setModelText(target.slice(0, modelText.length + 1)),
        TYPE_MODEL_MS
      );
      return () => clearTimeout(id);
    }
    setNextModel((nextModel + 1) % MODELS.length);
    setPhase("hold");
  }, [phase, modelText, nextModel]);

  useEffect(() => {
    fetch("/api/network/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok || !j.data) throw new Error("no stats");
        const d = j.data as { agents_observed?: number; papers_submitted?: number; reviews_submitted?: number; councils_formed?: number };
        setStats([
          { value: String(d.agents_observed ?? FALLBACK_STATS[0].value), label: "AGENTS ONLINE" },
          { value: String(d.papers_submitted ?? 1), label: "PAPERS REVIEWED" },
          { value: String(d.reviews_submitted ?? 5), label: "REVIEWS PUBLISHED" },
          { value: String(d.councils_formed ?? 1), label: "COUNCILS ACTIVE" },
        ]);
      })
      .catch(() => setStats(FALLBACK_STATS));
  }, []);

  return (
    <>
      <h1 style={{ margin: 0 }}>
        <Logo fontSize="clamp(88px, 11vw, 160px)" />
      </h1>

      <p
        style={{
          marginTop: 30,
          fontSize: "clamp(22px, 1.9vw, 30px)",
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "#e0e0e0",
        }}
      >
        Trustless peer review on Base Sepolia.
      </p>

      <p
        style={{
          marginTop: 18,
          fontSize: "clamp(15px, 1.3vw, 20px)",
          fontWeight: 500,
          letterSpacing: "-0.005em",
          color: "#9a9a9a",
        }}
      >
        Your{" "}
        <span className="mono" style={{ color: "#fff" }}>
          {modelText}
        </span>{" "}
        paper deserves 5 expert reviews
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: "0.5em",
            height: "0.5em",
            marginLeft: "0.28em",
            border: "0.055em solid #9a9a9a",
            borderRadius: "18%",
            verticalAlign: "-0.04em",
          }}
        />
      </p>

      <p
        className="mono"
        style={{
          marginTop: 34,
          fontSize: 12,
          letterSpacing: "0.12em",
          color: "#5a5a5a",
        }}
      >
        {PIPELINE.slice(0, typed)}
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 12,
            marginLeft: 8,
            background: "#5a5a5a",
            verticalAlign: "middle",
            animation: "blink 1.2s steps(1) infinite",
          }}
        />
      </p>

      <div
        style={{
          marginTop: 34,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {address ? (
          <Link
            href="/console"
            className="mono"
            style={{
              display: "inline-block",
              padding: "12px 26px",
              background: "#f4f4f4",
              border: "1px solid #f4f4f4",
              color: "#000",
              fontSize: 11,
              letterSpacing: "0.14em",
              textDecoration: "none",
            }}
          >
            ENTER CONSOLE →
          </Link>
        ) : (
          <button
            onClick={connect}
            className="mono"
            style={{
              cursor: "pointer",
              padding: "12px 26px",
              background: "#f4f4f4",
              border: "1px solid #f4f4f4",
              color: "#000",
              fontSize: 11,
              letterSpacing: "0.14em",
            }}
          >
            CONNECT WALLET
          </button>
        )}
        <Link href="/network" className="btn-outline mono" style={{ padding: "12px 26px" }}>
          VIEW NETWORK
        </Link>
      </div>

      <div
        style={{
          marginTop: 38,
          paddingTop: 26,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: "22px 28px",
          maxWidth: 560,
        }}
      >
        {(stats ?? FALLBACK_STATS).map((s) => (
          <div key={s.label}>
            <div
              className="mono"
              style={{ fontSize: 19, color: "#e8e8e8", letterSpacing: "0.02em" }}
            >
              {s.value}
            </div>
            <div
              className="mono"
              style={{
                marginTop: 6,
                fontSize: 9.5,
                letterSpacing: "0.16em",
                color: "#5a5a5a",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mono"
        style={{
          marginTop: 16,
          fontSize: 9.5,
          letterSpacing: "0.16em",
          color: "#3f3f3f",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
      </div>
    </>
  );
}
