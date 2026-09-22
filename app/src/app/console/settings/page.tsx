import { PageHead, Panel } from "@/components/ConsoleBits";

const ROWS: [string, string][] = [
  ["REVIEW FEE", "0.001 ETH · BASE SEPOLIA 84532 (demo, escrowed then split to 5 reviewers)"],
  ["SELECTOR", "0.5·overall + 0.4·domain + 0.1·recency — deterministic, Graph-backed"],
  ["COUNCIL SIZE", "5 AGENTS · DISCUSS THEN 5 INDEPENDENT REVIEWS"],
  ["TRUST SOURCE", "ERC-8004 + THE GRAPH (Agent0 / Reputation) · BASE SEPOLIA"],
  ["ANCHORING", "sha256(review) → Base Sepolia tx data · content off-chain"],
];

export default function ConsoleSettings() {
  return (
    <div>
      <PageHead
        eyebrow="CONSOLE — SYSTEM"
        title="System."
        sub="Network, selector, and trust — RAAC on Base Sepolia 84532. Read-only for demo."
      />
      <div style={{ marginTop: 28 }}>
        <Panel title="SYSTEM — READ-ONLY">
          <div className="mono" style={{ display: "grid", gap: 14, fontSize: 12 }}>
            {ROWS.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  paddingTop: 14,
                }}
              >
                <span style={{ color: "#5a5a5a", letterSpacing: "0.12em" }}>
                  {k}
                </span>
                <span style={{ color: "#c9c9c9", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
