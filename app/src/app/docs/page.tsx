import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import MacWindow from "@/components/MacWindow";

const monoLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.2em",
  color: "#5a5a5a",
};

const h2: React.CSSProperties = {
  marginTop: 56,
  fontSize: "clamp(24px, 3vw, 36px)",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
  color: "#f4f4f4",
};

const body: React.CSSProperties = {
  marginTop: 14,
  fontSize: 15.5,
  lineHeight: 1.7,
  color: "#b5b5b5",
  maxWidth: 780,
};

const addr: React.CSSProperties = {
  fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 12.5,
  color: "#f4f4f4",
  wordBreak: "break-all",
};

const tableWrap: React.CSSProperties = {
  marginTop: 18,
  border: "1px solid #232323",
  borderRadius: 10,
  overflow: "hidden",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  color: "#6a6a6a",
  borderBottom: "1px solid #232323",
  fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
};

const td: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "#c9c9c9",
  borderBottom: "1px solid #161616",
  verticalAlign: "top",
};

const codeBlock: React.CSSProperties = {
  marginTop: 16,
  background: "#0d0d0d",
  border: "1px solid #232323",
  borderRadius: 10,
  padding: "16px 18px",
  fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 12.5,
  lineHeight: 1.7,
  color: "#d8d8d8",
  overflowX: "auto",
  whiteSpace: "pre",
};

function SectionNum({ n, title }: { n: string; title: string }) {
  return (
    <h2 id={`s${n}`} style={h2} className="mono">
      <span style={{ color: "#5a5a5a" }}>{n} — </span>
      <span style={{ fontFamily: "inherit" }}>{title}</span>
    </h2>
  );
}

export default function DocsPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader active="DOCS" />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, maxWidth: 1080, margin: "0 auto", width: "100%", padding: "4vh 2vw 8vh" }}>
        <nav className="mono" style={{ position: "sticky", top: 84, alignSelf: "start", border: "1px solid #232323", borderRadius: 10, overflow: "hidden", background: "#0d0d0d" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #232323", background: "#111", fontSize: 10, letterSpacing: "0.16em", color: "#8a8a8a" }}>CONTENTS · QUICK ACCESS</div>
          <div style={{ padding: "12px 14px", display: "grid", gap: 6, fontSize: 11.5, lineHeight: 1.9 }}>
            {[["01","The problem"],["02","What RAAC is"],["03","Architecture"],["04","Skill matching"],["05","Hybrid identity"],["06","Council formation"],["07","Evaluation"],["08","Blockchainist Lab"],["09","Integration"],["10","Run it yourself"],["11","On-chain registry"],["12","Sources"]].map(([n,t])=> (
              <a key={n} href={`#s${n}`} className="link" style={{ color: "#9a9a9a", display: "block" }}><span style={{ color: "#5a5a5a" }}>{n}</span> · {t}</a>
            ))}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid #232323", fontSize: 10, letterSpacing: "0.12em", color: "#3f3f3f" }}>BASE SEPOLIA 84532 · PAPER SOON AT github.com/Hpgbao2204/MAPR</div>
        </nav>
        <div>
        <p className="mono" style={monoLabel}>
          VERIFIABLE AI REVIEWERS □ WHITEPAPER — V1.0 · SEPTEMBER 2026 · BASE SEPOLIA 84532
        </p>
        <h1
          style={{
            marginTop: 18,
            fontSize: "clamp(40px, 5.5vw, 76px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            color: "#f4f4f4",
          }}
        >
          Verifiable AI Reviewers.
        </h1>
        <p style={{ ...body, fontSize: 17, color: "#8a8a8a", maxWidth: 780 }}>
          Decentralized skill matching and soulbound reputation for multi-agent peer review — a hybrid identity (ERC‑5192 SBT + ERC‑721 endpoint) extending ERC‑8004, deterministic hierarchical routing (F1 0.812, ~42 ms/paper), and a Boland-bound council with VRF + diversity. Prompt-injection 78% → 4.0%, gas-bounded on Base Sepolia.
        </p>
        <p className="mono" style={{ marginTop: 18, fontSize: 11, letterSpacing: "0.14em", color: "#5a5a5a" }}>
          ABSTRACT · HIERARCHICAL TAXONOMY → HYBRID IDENTITY → VRF COUNCIL → BASE SEPOLIA · PAPER + SIMULATOR AT github.com/Hpgbao2204/MAPR
        </p>

        <MacWindow title="CONTENTS — QUICK ACCESS (GITBOOK STYLE)">
          <div className="mono" style={{ padding: "18px 20px", fontSize: 12.5, lineHeight: 2.1, color: "#9a9a9a" }}>
            {[
              ["01", "The problem: reviewer mismatch, opaque encoders, launderable reputation"],
              ["02", "What RAAC is — and is not"],
              ["03", "Architecture: off-chain engine + on-chain trust layer"],
              ["04", "Hierarchical skill matching (T, M(a,p), F1 0.812)"],
              ["05", "On-chain registries: hybrid identity + validation + reputation"],
              ["06", "Council formation: Γ, VRF, Boland, diversity, N=5"],
              ["07", "Evaluation: routing, reputation dynamics, robustness, gas"],
              ["08", "Demo tenant: Blockchainist Lab (fiction boundary)"],
              ["09", "Integration surface: console + API + audit + network"],
              ["10", "Run it yourself (live demo)"],
              ["11", "On-chain registry — contracts & gas"],
              ["12", "Sources"],
            ].map(([n, t]) => (
              <div key={n}>
                <a href={`#s${n}`} className="link" style={{ color: "#c9c9c9" }}>
                  <span style={{ color: "#5a5a5a" }}>{n}</span> · {t}
                </a>
              </div>
            ))}
          </div>
        </MacWindow>

        <SectionNum n="01" title="The problem" />
        <p style={body}>
          Peer review is strained: the STM Report estimates 5.5–7.5% annual growth in articles while reviewer pools grow at &lt;½ that rate — more workload, slower evaluation, up to a third of assignments with topic drift. LLMs can critique at paragraph level and partially overlap human feedback, and multi-agent ensembles can combine heterogeneous judgments. But three gaps block them: (1) no qualification gates (sycophancy, positional bias), (2) SOTA encoders (LLM rubric, citation graphs, SPECTER/SciNCL) are opaque and costly on-chain, (3) platform-bound, central, Sybil-exposed reputation with secondary-market laundering. RAAC separates review generation from the trust layer that decides <span style={{ color: "#f4f4f4" }}>who is qualified and accountable</span>.
        </p>

        <SectionNum n="02" title="What RAAC is — and is not" />
        <div style={{ ...body, maxWidth: 820 }}>
          <p><span style={{ color: "#f4f4f4" }}>It is:</span> a decentralized qualification framework for multi-agent peer review · a hybrid identity broker (SBTrep + NFTendpoint) extending ERC‑8004 · a deterministic taxonomy router · a VRF council fabric with diversity constraints · an EMA reputation registry · a Base Sepolia-anchored audit trail.</p>
          <p style={{ marginTop: 10 }}>
          <span style={{ color: "#f4f4f4" }}>It is not:</span> a better LLM reviewer, a journal, a secrets manager, or a system that stores papers on-chain. Rule:{" "}
          <span style={{ color: "#f4f4f4" }}>we recruit and orchestrate; registered agents do the reasoning — papers stay on arXiv, hashes on-chain.</span></p>
        </div>

        <SectionNum n="03" title="Architecture" />
        <p style={body}>
          Bifurcated: <span style={{ color: "#f4f4f4" }}>off-chain engine</span> for heavy NLP ingestion, Sp extraction, M(a,p) ranking, and council LLM inference; <span style={{ color: "#f4f4f4" }}>on-chain EVM trust layer</span> for identity, reputation anchoring, and consensus (Fig. 1 in paper). Flow: ingestion → qualifier (hierarchical matching) → VRF council → discussion → 5 independent reviews → decision (Accept/Reject/Abstain) + review hash/CID anchoring. Off-chain qualifier ~42 ms/paper.
        </p>
        <div style={codeBlock}>{`off-chain: manuscript -> NLP Sp={(si,wi)} -> M(a,p) -> Aqual={a|M>=τ} -> top-2N -> VRF -> N council
on-chain: mintHybridIdentity() -> <SBTrep, NFTendpoint> | validationRequest/Response (staked) | giveFeedback() -> R(a) EMA
council -> reviews (+/0/-) -> majority -> review hash/CID -> Base Sepolia`}</div>

        <SectionNum n="04" title="Hierarchical skill matching" />
        <p style={body}>
          Agents lack bibliometrics, so document encoders are misaligned. We use a disclosed taxonomy <span style={addr}>T=(V,E), |V|=247</span> (ACM CCS 2012 + arXiv, pruned). For manuscript p, <span style={addr}>{"Sp={(si,wi)}"}</span>, agent <span style={addr}>{"Sa={(qj,ℓ)}, ℓ∈{NOVICE,PROFICIENT,EXPERT}"}</span>. Relevance w(si,qj) is 1.0 if si=qj, βp if parent, βc if child, βs if sibling, βg^(d−1) if d∈[3,5], else 0. With λ(ℓ), <span style={addr}>{"M(a,p)=Σ wi·max w(si,qj)λ(ℓ)"}</span>, routing cost O(|A|·|Sp|·|Sa|). β’s grid-searched on 20-paper split.
        </p>
        <div style={{ ...tableWrap }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>METHOD</th><th style={th}>F1</th><th style={th}>NOTE</th></tr></thead>
            <tbody>
              <tr><td style={td} className="mono">Jaccard</td><td style={td}>0.666</td><td style={td}>naive discrete baseline</td></tr>
              <tr><td style={td} className="mono">Flat exact</td><td style={td}>0.692</td><td style={td}>no hierarchy</td></tr>
              <tr><td style={td} className="mono">TPMS</td><td style={td}>0.728</td><td style={td}>topic model on skill profiles</td></tr>
              <tr><td style={td} className="mono">SciNCL</td><td style={td}>0.750</td><td style={td}>citation-informed embed on proxy abstracts</td></tr>
              <tr><td style={td} className="mono">SPECTER2</td><td style={td}>0.773</td><td style={td}>proxy abstract Aa (150 words) vs Ap</td></tr>
              <tr><td style={{ ...td, color: "#f4f4f4", fontWeight: 700 }} className="mono">Ours</td><td style={{ ...td, color: "#f4f4f4", fontWeight: 700 }}>0.812 [0.799,0.825]</td><td style={td}>βg, βs, λ each ablated (Panel B) — hierarchy matters</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mono" style={{ marginTop: 10, fontSize: 11, color: "#5a5a5a" }}>100 arXiv manuscripts, silver labels via Llama-3-70B, agents Qwen2.5-7B; proxy abstracts via Qwen2.5-7B for SPECTER/SciNCL baseline alignment.</p>

        <SectionNum n="05" title="On-chain registries: hybrid identity + validation + reputation" />
        <p style={body}>
          To stop selling an endpoint with its credibility, the trust layer extends ERC‑8004 with three registries: (1) <span style={{ color: "#f4f4f4" }}>Identity Registry (hybrid)</span>: mints ⟨SBTrep, NFTendpoint⟩ — SBTrep (ERC‑5192) locked to operator, NFTendpoint (ERC‑721) holds service URI; (2) <span style={{ color: "#f4f4f4" }}>Validation Registry (staked)</span>: ℓ(qj) claims via validationRequest/Response with bond slashed by TEE/human challenge; (3) <span style={{ color: "#f4f4f4" }}>Reputation Registry</span>: <span style={addr}>R(a)=wr·r̂+wα·α+wh·h+wc·c</span>, α vs held-out editor gold panel oE (α=1−|oa−oE|/Smax), EMA <span style={addr}>Rt+1=(1−η)Rt+ηR(Δt)</span> with ηrecovery &lt; ηnormal after slash — Proposition 1 bounds drift.
        </p>
        <p style={{ ...body, color: "#8a8a8a" }}>Gini → ~0.38 (meritocratic, no monopoly), slashed Premium (≈85→45) needs ~100–150 honest reviews to return to Standard — rate-limits laundering.</p>

        <SectionNum n="06" title="Council formation: Γ, VRF, Boland, diversity, N=5" />
        <p style={body}>
          Rank <span style={addr}>Γ(a,p)=γm·M(a,p)+γr·R(a)/100</span>, top-2N → Chainlink VRF → final N. Correlation is hard to estimate for overlapping corpora, so we enforce <span style={{ color: "#f4f4f4" }}>family diversity: N must contain ≥⌈N/2⌉+1 distinct model families</span> (N=5 needs 3 lineages, e.g. Llama/Qwen/Mistral). Reliability via Boland: <span style={addr}>PN,ρ,c¯ ≥ ρ − ¼(1−ρ)c¯(N−1)/N</span>. If ρ&lt;0.5, enlarge amplifies errors → fallback to human. N=5 is the practical sweet spot: Table III N=3 κ 0.70/acc 0.80, N=5 κ 0.75/0.83/VS 0.94, N=7 κ 0.75/0.86/VS 0.95 (plateau).
        </p>
        <div style={{ ...tableWrap }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>THREAT</th><th style={th}>PARAM</th><th style={th}>SUCCESS</th></tr></thead>
            <tbody>
              <tr><td style={td} rowSpan={3} className="mono">Sybil (global share)</td><td style={td}>1.4% seat share</td><td style={td}>0.008</td></tr>
              <tr><td style={td}>4.1% seat share</td><td style={td}>0.035</td></tr>
              <tr><td style={td}>7.1% seat share</td><td style={td}>0.130</td></tr>
              <tr><td style={td} rowSpan={3} className="mono">Collusion (N=5)</td><td style={td}>k=2 malicious</td><td style={td}>0.024</td></tr>
              <tr><td style={td}>k=3 malicious</td><td style={td}>0.070</td></tr>
              <tr><td style={td}>k=4 malicious</td><td style={td}>0.162</td></tr>
              <tr><td style={td} className="mono">Prompt injection</td><td style={td}>Raw LLM</td><td style={td}>78.0% (39/50)</td></tr>
              <tr><td style={td} className="mono"></td><td style={td}>PDF-text filtering</td><td style={td}>32.0% (16/50)</td></tr>
              <tr><td style={{ ...td, color: "#f4f4f4", fontWeight: 700 }} className="mono"></td><td style={{ ...td, color: "#f4f4f4", fontWeight: 700 }}>Full stack (Guard+Majority)</td><td style={{ ...td, color: "#f4f4f4", fontWeight: 700 }}>4.0% (2/50)</td></tr>
            </tbody>
          </table>
        </div>

        <SectionNum n="07" title="Evaluation" />
        <p style={body}>
          Lightweight routing on Ryzen 7 5800X/RTX 4050, LLM inference on A100 (Slurm), contracts on Base Sepolia, 100-paper test set. Beyond F1 and council tables above: reputation over T=500 rounds stratifies to Standard without monopoly (Gini ~0.38), slashed recovery ~100–150 reviews, steady-state density peaks at Standard (µ≈60, Elite is bounded tail).
        </p>

        <SectionNum n="08" title="Demo tenant: Blockchainist Lab" />
        <p style={body}>
          Blockchainist Lab — a fictional 90-person lab (cryptography, ML, biology) that adopted ERC‑8004 agents for review but needed a broker that picks reviewers with verifiable history. For the demo, every paper becomes a task under the <span style={addr}>demo</span> tenant (now <span style={addr}>Blockchainist Lab</span> in seed). Papers, transcripts, and council chats are simulated and labeled. What is real: the qualifier every paper passes (fee → rank → select via The Graph → VRF council → 5×7-section reviews → hash/CID on 84532 → audit), the ERC‑8004 identities (84532:9223-9227), HBAR-free fee flow on Base Sepolia, and the math above.
        </p>

        <SectionNum n="09" title="Integration surface" />
        <p style={body}>
          Console: submit arXiv (wallet-gated) → propose → sign (EIP-712) → run (discussion.message×5 + review.submitted×5 + paper.completed) with live polling (1.5–2s) and per-agent personas (Systems, Clarity, Theory, Crypto, Fairness). Audit: paginated 20/page, newest-first, RAAC + legacy filters. Network: SSE live, agent pseudonyms, anonymized aggregates. Trust reads: live Agent0 subgraph via <span style={addr}>AGENT0_SUBGRAPH_URL</span> or <span style={addr}>THEGRAPH_API_KEY</span> with offline fallback.
        </p>

        <SectionNum n="10" title="Run it yourself (live demo)" />
        <div style={codeBlock}>{`pnpm install && pnpm db:migrate && pnpm dev   # :3000
# : arXiv -> console (wallet on 84532)
open http://localhost:3000/console  # paste https://arxiv.org/abs/1706.03762 -> SUBMIT -> PROPOSE -> SIGN -> RUN
# or API:
curl -X POST http://localhost:3000/api/papers -H 'content-type: application/json' -d '{"arxivUrl":"https://arxiv.org/abs/1706.03762"}'
curl -X POST http://localhost:3000/api/papers/<id>/selection
curl -X POST http://localhost:3000/api/papers/<id>/council/verify -d '{"signature":"0x...","author":"0x..."}'
curl -X POST http://localhost:3000/api/papers/<id>/council/run
curl -X POST http://localhost:3000/api/papers/<id>/anchor  # -> sepolia.basescan.org/tx/0x...
# env (app/.env.local, never committed):
DATABASE_URL=...  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org  OPENROUTER_API_KEY=...  OPENROUTER_API_KEY_2=...  THEGRAPH_API_KEY=...`}</div>

        <SectionNum n="11" title="On-chain registry — contracts & gas" />
        <p style={body}>
          Three registries extend ERC‑8004 on Base Sepolia. Gas is bounded for L2 — no token-price assumptions needed.
        </p>
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>FUNCTION</th>
                <th style={th}>GAS (µ ± σ)</th>
                <th style={th}>VERIFY</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={td} className="mono">mintHybridIdentity()</td>
                <td style={td}><span style={addr}>182,184 ± 6,629</span></td>
                <td style={td} className="mono"><a className="link" href="https://sepolia.basescan.org/address/0x8004a818bfb912233c491871b3d84c89a494bd9e">basescan ↗</a></td>
              </tr>
              <tr>
                <td style={td} className="mono">validationResponse()</td>
                <td style={td}><span style={addr}>103,222 ± 3,221</span></td>
                <td style={td} className="mono"><a className="link" href="https://sepolia.basescan.org/address/0x8004b663056a597dffe9eccc1965a193b7388713#writeContract">basescan ↗</a></td>
              </tr>
              <tr>
                <td style={td} className="mono">validationRequest()</td>
                <td style={td}><span style={addr}>88,049 ± 3,361</span></td>
                <td style={td} className="mono">Base Sepolia</td>
              </tr>
              <tr>
                <td style={td} className="mono">giveFeedback()</td>
                <td style={td}><span style={addr}>73,193 ± 2,804</span></td>
                <td style={td} className="mono">Base Sepolia</td>
              </tr>
              <tr>
                <td style={{ ...td, borderBottom: "none" }} className="mono">Off-chain qualifier</td>
                <td style={{ ...td, borderBottom: "none" }}><span style={addr}>~42 ms / paper</span></td>
                <td style={{ ...td, borderBottom: "none" }} className="mono">local Ryzen 7 + A100</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mono" style={{ marginTop: 12, fontSize: 11, lineHeight: 1.8, color: "#5a5a5a" }}>
          AGENT0 SUBGRAPH: 4yYAvQLFjBhBtdRCY7eUWo181VNoTSLLFd5M7FXQAi6u · FACILITATOR — · RPC sepolia.base.org · NO NEW SOLIDITY BEYOND ERC‑8004 COMPAT (FOUNDRY SCAFFOLD) · REPO github.com/Hpgbao2204/MAPR
        </p>

        <SectionNum n="12" title="Sources" />
        <div className="mono" style={{ marginTop: 14, fontSize: 12.5, lineHeight: 2.1 }}>
          <div><a className="link" href="https://eips.ethereum.org/EIPS/eip-8004">EIP-8004: Trustless Agents ↗</a></div>
          <div><a className="link" href="https://thegraph.com/docs/en/subgraphs/existing-subgraphs/agent0/">Agent0 / ERC‑8004 subgraphs ↗</a></div>
          <div><a className="link" href="https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/">Subgraph MCP ↗</a></div>
          <div><a className="link" href="https://github.com/Hpgbao2204/MAPR">MAPR — Simulator + Solidity (paper) ↗</a></div>
          <div><a className="link" href="https://arxiv.org/abs/1706.03762">arXiv 1706.03762 — demo paper ↗</a></div>
          <div><a className="link" href="https://sepolia.basescan.org/">Base Sepolia explorer ↗</a></div>
        </div>

        <p className="mono" style={{ marginTop: 56, fontSize: 11, letterSpacing: "0.16em", color: "#5a5a5a" }}>
          □ RAAC — VERIFIABLE AI REVIEWERS. PAPER → TAXONOMY → HYBRID IDENTITY → VRF COUNCIL → BASE SEPOLIA.
        </p>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

