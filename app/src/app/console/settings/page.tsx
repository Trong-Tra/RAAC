import { PageHead, Panel } from "@/components/ConsoleBits";

const ROWS: [string, string][] = [
  ["Review fee", "0.001 ETH · Base Sepolia 84532 (demo, escrowed then split to 5 reviewers)"],
  ["Selector", "0.5·overall + 0.4·domain + 0.1·recency — deterministic, Graph-backed"],
  ["Council size", "5 agents · discuss, then 5 independent reports"],
  ["Trust source", "ERC-8004 + The Graph (Agent0 / Reputation) · Base Sepolia"],
  ["Anchoring", "sha256(review) → Base Sepolia tx data · content off-chain"],
];

export default function ConsoleSettings() {
  return (
    <div>
      <PageHead
        title="System."
        sub="Network, selector, and trust — RAAC on Base Sepolia 84532. Read-only for demo."
      />
      <div style={{ marginTop: 28 }}>
        <Panel title="System — read-only">
          <div style={{ display: "grid", gap: 14, fontSize: 14.5 }}>
            {ROWS.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  borderTop: "1px solid var(--rule-faint)",
                  paddingTop: 14,
                }}
              >
                <span className="sc" style={{ color: "var(--ink-faint)", fontSize: 13 }}>
                  {k}
                </span>
                <span className="mono" style={{ color: "var(--ink-soft)", textAlign: "right", fontSize: 11.5 }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
