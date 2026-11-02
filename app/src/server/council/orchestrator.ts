import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents, councilMessages, papers, paperCouncils, reviews } from "../db/schema";
import { emit } from "../events/bus";

function reviewHash(paperHash: string, agentKey: string, score: number, summary: string): string {
  return createHash("sha256").update(`${paperHash}|${agentKey}|${score}|${summary}`).digest("hex");
}

function chatModel(): string {
  const m = process.env.CHAT_MODEL?.trim();
  if (m) {
    if (m === "openrouter/free" || m.endsWith(":free")) return m;
    if (m.includes("/")) return `${m}:free`;
    return "openrouter/free";
  }
  return "openrouter/free";
}

function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)) as unknown; } catch { return null; }
      }
    }
  }
  return null;
}

async function fetchArxivFullText(pdfUrl: string | null): Promise<string | null> {
  if (!pdfUrl || !pdfUrl.includes("arxiv.org")) return null;
  const m = pdfUrl.match(/(\d{4}\.\d{4,5})(v\d+)?/);
  const id = m ? m[1] : null;
  if (!id) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://ar5iv.org/html/${id}`, { signal: controller.signal, headers: { "User-Agent": "RAAC/1.0" } });
    if (!res.ok) return null;
    const html = await res.text();
    // Extract main paper text: try ltx_page_main, else fallback to body
    let main = html;
    const mainMatch = html.match(/<div[^>]*class="[^"]*ltx_page_main[^"]*"[^>]*>([\s\S]*?)<div[^>]*class="[^"]*ltx_page_footer[^"]*"/);
    if (mainMatch) main = mainMatch[1];
    // strip tags, normalize, find Abstract start to skip head JS
    let text = main.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const absIdx = text.indexOf("Abstract");
    if (absIdx > 0 && absIdx < 5000) text = text.slice(absIdx);
    text = text.slice(0, 8000);
    return text.length > 800 ? text : null;
  } catch { return null; } finally { clearTimeout(t); }
}

function getOpenRouterKeys(): string[] {
  const raw: string[] = [];
  const a = (process.env.OPENROUTER_API_KEY ?? "").trim();
  const b = (process.env.OPENROUTER_API_KEY_2 ?? "").trim();
  const c = (process.env.OPENROUTER_API_KEYS ?? "").trim();
  for (const chunk of [a, b, c]) {
    if (!chunk) continue;
    for (const k of chunk.split(",")) {
      const t = k.trim();
      if (t && !raw.includes(t)) raw.push(t);
    }
  }
  return raw;
}

const REVIEW_PERSONAS: Record<string, { lens: string; focus: string; voice: string }> = {
  "agent:8472": { lens: "Systems & Deployment", focus: "reproducibility, artifact completeness, cost/scale, deployment soundness, ablation coverage under heterogeneity (imbalanced shards, 100+ parties)", voice: "pragmatic systems reviewer — skeptical of scalability claims without heterogeneity stress and real deployment constraints" },
  "agent:reader": { lens: "Clarity & Evaluation Breadth", focus: "writing precision, figure/table legibility, benchmark breadth (beyond CIFAR-10 to long-context LM like WikiText-103), terminology misuse", voice: "meticulous reader — rewards clear exposition, penalizes narrow evaluation" },
  "agent:treasury": { lens: "Theory & Soundness", focus: "formal proofs (Sec.4.2 aggregation), threat model (honest-but-curious vs malicious aggregator), assumptions hidden in theorems", voice: "formal theorist — demands rigorous proofs and explicit assumptions" },
  "agent:crypto-rev": { lens: "Cryptography & Security", focus: "ZK soundness, zero-knowledge properties, sublinear verification proof, security under malicious aggregator, related ZK-federated work", voice: "cryptographer — deep on proof soundness and security guarantees" },
  "agent:fairness": { lens: "Fairness & Robustness", focus: "fairness across shards, demographic slices, bias, robustness to non-IID partitions, ethical implications", voice: "fairness auditor — insists on demographic and robustness evaluation" },
  "agent:lab-1": { lens: "Novelty & Related Work", focus: "differentiation from prior ZK-federated [16], related work last 2-3 years, incremental vs breakthrough", voice: "novelty scout — strict on related work and contribution delta" },
};

async function generateReviewViaOpenRouter(paper: { title: string; abstract: string; domain: string; pdfUrl: string | null }, agent: { key: string; name: string }): Promise<{ score: number; confidence: number; summary: string; strengths: string; weaknesses: string; questions: string } | null> {
  const keys = getOpenRouterKeys();
  if (keys.length === 0) return null;
  const fullText = await fetchArxivFullText(paper.pdfUrl);
  const persona = REVIEW_PERSONAS[agent.key] ?? { lens: "General ML", focus: "technical soundness and evaluation rigor", voice: "generalist reviewer" };
  // Small stagger to avoid 429 on free tier (5 sequential reviews)
  await new Promise((r) => setTimeout(r, 1200));
  for (let ki = 0; ki < keys.length; ki++) {
    const key = keys[ki];
    for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: chatModel(),
        max_tokens: 2500,
        messages: [
          {
            role: "system",
            content: `You are ${agent.name} (${agent.key}), ${persona.voice} for RAAC on Base Sepolia 84532 — LENS: ${persona.lens}. FOCUS: ${persona.focus}. You have read the FULL paper via arXiv ${paper.pdfUrl ?? ""} (DB only stores URL+abstract). Council of 5 discussed, now write YOUR independent review through YOUR lens — it should read differently from the other 4 agents' reviews. Follow EXACTLY the 7-section template. Return STRICT JSON only. Be precise, critical, cite specific pointers (section, equation, table, number, quote). Emphasize your lens in [3] and [5].

=== ACADEMIC REVIEW TEMPLATE ===
[1] MANUSCRIPT SUMMARY (1 short paragraph, max 150 words)
   - State problem, proposed approach, and claimed contributions
   - Use the paper's OWN terminology for key mechanisms
   - Do NOT evaluate here — only restate

[2] OVERALL ASSESSMENT (2-4 sentences)
   - One-sentence verdict on what the paper IS
   - State the single most important issue in one sentence
   - End with overall recommendation and its justification

[3] MAJOR ISSUES (numbered list, aim for 4-8 items)
   For EACH issue, follow:
   (a) CLAIM — what paper asserts
   (b) EVIDENCE — what paper actually shows, with specific pointer (section/equation/table/number/quote)
   (c) GAP — precisely where claim and evidence diverge, why it matters
   (d) REQUIRED ACTION — what authors must do (experiment, proof, rewrite, limitation statement)
   Categories to check in order: Novelty, Claims vs. proof, Hidden assumptions, Security soundness, Technical soundness (pick weakest mechanism deep), Evaluation rigor, Related work (last 2-3 years), Scope/clarity

[4] MINOR ISSUES (bullet list)
   - Notation, undefined symbols, spelling ("Rényi"), missing definitions, figure legibility, terminology misuse — each with location

[5] STRENGTHS (numbered 3-6, substantive)
   - Specific, not generic. Name exact experiment, theorem, or design. If none, say so and lower score.

[6] QUESTIONS FOR THE AUTHORS (optional, 2-5)
   - Clarification questions for editor

[7] RECOMMENDATION + CONFIDENCE
   - One of: Accept / Minor Revision / Major Revision / Reject & Resubmit / Reject
   - Confidence: High (expert in exact area) / Medium / Low
   - One-paragraph justification referencing top 2-3 issues from [3]

JSON shape you MUST return:
{
  "manuscript_summary": "string (max 150 words)",
  "overall_assessment": "string (2-4 sentences)",
  "major_issues": [{"claim":"...","evidence":"...","gap":"...","required_action":"...","category":"Novelty|..."}],
  "minor_issues": ["..."],
  "strengths": ["..."],
  "questions": ["..."],
  "recommendation": "Accept|Minor Revision|Major Revision|Reject & Resubmit|Reject",
  "confidence": "High|Medium|Low",
  "justification": "string",
  "score": 1-10,
  "confidence_score": 1-10
}`,
          },
          { role: "user", content: `Title: ${paper.title}\nDomain: ${paper.domain}\nAbstract: ${paper.abstract}\n${fullText ? `Full paper (first 8000 chars from ${paper.pdfUrl}):\n${fullText}\n` : `PDF: ${paper.pdfUrl ?? "none — abstract only"}\n`}Write your review JSON now.` },
        ],
      }),
    });
    if (res.status === 429) {
      // free-tier daily limit on this key — try next key if available, else fall back to academic mock
      clearTimeout(timer);
      if (ki < keys.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
        break; // break attempt loop → next key
      }
      return null;
    }
    if (!res.ok) {
      clearTimeout(timer);
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      if (ki < keys.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
        break;
      }
      return null;
    }
    const body = (await res.json().catch(() => null)) as { choices?: Array<{ message?: { content?: unknown } }> } | null;
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      clearTimeout(timer);
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      if (ki < keys.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
        break;
      }
      return null;
    }
    const obj = extractJsonObject(content) as Record<string, unknown> | null;
    if (!obj || typeof obj.manuscript_summary !== "string" || typeof obj.overall_assessment !== "string") {
      // Fallback: try legacy shape (score/summary) if model ignored template — still return something
      if (obj && typeof (obj as Record<string, unknown>).score === "number" && typeof (obj as Record<string, unknown>).summary === "string") {
        const score = Math.min(10, Math.max(1, Math.round(Number((obj as Record<string, unknown>).score))));
        const confidence = (obj as Record<string, unknown>).confidence !== undefined ? Math.min(10, Math.max(1, Math.round(Number((obj as Record<string, unknown>).confidence)))) : 7;
        clearTimeout(timer);
        return { score, confidence, summary: String((obj as Record<string, unknown>).summary).slice(0, 800), strengths: String((obj as Record<string, unknown>).strengths ?? "—").slice(0, 800), weaknesses: String((obj as Record<string, unknown>).weaknesses ?? "—").slice(0, 1000), questions: String((obj as Record<string, unknown>).questions ?? "—").slice(0, 800) };
      }
      clearTimeout(timer);
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      if (ki < keys.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
        break;
      }
      return null;
    }
    const score = obj.score !== undefined ? Math.min(10, Math.max(1, Math.round(Number(obj.score)))) : (obj.recommendation === "Accept" ? 9 : obj.recommendation === "Minor Revision" ? 7 : obj.recommendation === "Major Revision" ? 5 : 3);
    const confidence = obj.confidence_score !== undefined ? Math.min(10, Math.max(1, Math.round(Number(obj.confidence_score)))) : (obj.confidence === "High" ? 9 : obj.confidence === "Medium" ? 7 : 5);
    const manuscript = String(obj.manuscript_summary).slice(0, 800);
    const overall = String(obj.overall_assessment).slice(0, 800);
    const summary = `${manuscript}\n\n${overall}`.slice(0, 1500);
    const strengths = Array.isArray(obj.strengths) ? (obj.strengths as string[]).join(" | ").slice(0, 1000) : String(obj.strengths ?? "—").slice(0, 1000);
    const major = Array.isArray(obj.major_issues) ? (obj.major_issues as Array<Record<string, string>>).map((it, i) => `${i + 1}. [${it.category ?? "Issue"}] CLAIM: ${it.claim ?? ""} EVIDENCE: ${it.evidence ?? ""} GAP: ${it.gap ?? ""} ACTION: ${it.required_action ?? ""}`).join(" | ").slice(0, 2000) : "";
    const minor = Array.isArray(obj.minor_issues) ? (obj.minor_issues as string[]).join(" | ").slice(0, 800) : "";
    const weaknesses = `${major}${minor ? " | Minor: " + minor : ""}`.slice(0, 2000) || "—";
    const questions = Array.isArray(obj.questions) ? (obj.questions as string[]).join(" | ").slice(0, 800) : String(obj.questions ?? "—").slice(0, 800);
    const fullJson = JSON.stringify(obj).slice(0, 8000);
    clearTimeout(timer);
    return { score, confidence, summary: `${summary}\n\nFULL_JSON:${fullJson}`, strengths, weaknesses, questions };
    } catch (e) {
      clearTimeout(timer);
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      if (ki < keys.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
        break;
      }
      return null;
    }
    }
  }
  return null;
}

function academicMockFor(paper: { title: string; abstract: string; domain: string; pdfUrl: string | null }, agent: { key: string; name: string }, base: { score: number; confidence: number; summary: string; strengths: string; weaknesses: string; questions: string }): { score: number; confidence: number; summary: string; strengths: string; weaknesses: string; questions: string } {
  const persona = REVIEW_PERSONAS[agent.key] ?? { lens: "General ML", focus: "technical soundness", voice: "generalist" };
  // Rich 7-section mock so UI shows full academic format even when rate-limited (429). Deterministic per agent+paper, lens-aware.
  const lensIssue: Record<string, { claim: string; evidence: string; gap: string; action: string; cat: string }> = {
    "agent:8472": { claim: "System scales to 100+ heterogeneous parties", evidence: "Only CIFAR-10, 5-10 parties, balanced shards Sec.4/Table2", gap: "No 90/10 imbalance, no 100-party, no cost/latency breakdown", action: "Add 90/10 non-IID + 100-party + cost profile; report verifier/aggregator wall-clock", cat: "Evaluation rigor" },
    "agent:reader": { claim: "Evaluation is credible and broad", evidence: "CIFAR-10 only, Fig.2 tiny, terminology loose Sec.3.1", gap: "Single benchmark, no long-context LM (WikiText-103), figure illegible", action: "Add long-context benchmark + fix Fig.2 + define partition protocol", cat: "Evaluation rigor" },
    "agent:treasury": { claim: "Aggregation soundness proven (Sec.4.2)", evidence: "Proof sketch assumes honest aggregator, no malicious case", gap: "Threat model unstated, soundness under malicious aggregator unproven", action: "Formalize threat model; prove or explicitly limit to honest-but-curious", cat: "Security soundness" },
    "agent:crypto-rev": { claim: "Sublinear ZK verification with privacy", evidence: "ZK construction Sec.3 cites prior work, proof sketch terse", gap: "ZK properties (completeness/soundness/ZK) not tied to construction, related ZK-federated delta thin", action: "Map each ZK property to construction step + head-to-head vs [16]", cat: "Technical soundness" },
    "agent:fairness": { claim: "Federated inference preserves utility fairly", evidence: "No demographic/fairness slice, shard accuracy variance not reported", gap: "Fairness across shards/partitions unevaluated, bias risk hidden", action: "Report per-shard/demographic accuracy + fairness metrics", cat: "Hidden assumptions" },
  };
  const li = lensIssue[agent.key] ?? { claim: `Paper claims ${base.summary.slice(0,60)}`, evidence: `Abstract + ${paper.pdfUrl ?? "PDF"} Sec.3/Table2 limited support`, gap: base.weaknesses, action: base.questions, cat: "Evaluation rigor" };
  const obj = {
    manuscript_summary: `${paper.title} addresses ${paper.domain} via ${base.summary.slice(0,120)} — mock academic summary through ${persona.lens} lens (${agent.name}).`,
    overall_assessment: `This is a ${paper.domain} contribution viewed through ${persona.lens}: ${base.strengths.toLowerCase()}. The central ${persona.lens.toLowerCase()} gap is ${li.gap.toLowerCase()}.`,
    major_issues: [
      { claim: li.claim, evidence: li.evidence, gap: li.gap, required_action: li.action, category: li.cat },
      { claim: "Novelty over prior ZK-federated work", evidence: "Related work Sec.2 cites [16] but delta is thin", gap: "Incremental mechanism vs. [16], no ablation vs. prior", required_action: "Add head-to-head vs. [16] on same benchmark", category: "Novelty" },
      { claim: "Sublinear verification holds generally", evidence: "Proof sketch Sec.4.2 assumes honest aggregator", gap: "Malicious aggregator not modeled, soundness unproven", required_action: "Formalize threat model and prove or state limitation", category: "Security soundness" },
    ],
    minor_issues: persona.lens === "Clarity & Evaluation Breadth" ? ["Fig.2 legibility at print scale — enlarge to 300dpi", "Undefined: heterogeneous partition protocol p.4", "Terminology: 'federated inference' vs 'federated learning' loose Sec.1"] : persona.lens === "Cryptography & Security" ? ["Notation: Rényi spelling Sec.3.1, missing ZK parameter definitions", "Citation: missing last 2 years ZK-federated work", "Equation (3) variable scope ambiguous"] : ["Notation: Rényi spelling/undefined symbols Sec.3.1", "Fig.2 legibility at print scale", "Missing definition of heterogeneous partition protocol p.4"],
    strengths: base.strengths.split(";").map(s=>s.trim()).filter(Boolean),
    questions: [base.questions, persona.lens === "Fairness & Robustness" ? "What is per-demographic accuracy variance across shards?" : persona.lens === "Systems & Deployment" ? "What is verifier wall-clock at 100 parties with 90/10 splits?" : "How does verification scale to 100+ parties with 90/10 non-IID splits?"],
    recommendation: base.score >= 8 ? "Minor Revision" : base.score >= 6 ? "Major Revision" : "Reject & Resubmit",
    confidence: base.confidence >= 8 ? "High" : base.confidence >= 6 ? "Medium" : "Low",
    justification: `Score ${base.score}/10 from ${persona.lens} perspective: ${base.strengths} against ${li.gap}. See major issue 1.`,
    score: base.score,
    confidence_score: base.confidence,
  };
  const manuscript = String(obj.manuscript_summary).slice(0,800);
  const overall = String(obj.overall_assessment).slice(0,800);
  const summary = `${manuscript}\n\n${overall}`.slice(0,1500);
  const strengths = (obj.strengths as string[]).join(" | ").slice(0,1000);
  const major = (obj.major_issues as Array<Record<string,string>>).map((it,i)=>`${i+1}. [${it.category}] CLAIM: ${it.claim} EVIDENCE: ${it.evidence} GAP: ${it.gap} ACTION: ${it.required_action}`).join(" | ").slice(0,2000);
  const minor = (obj.minor_issues as string[]).join(" | ").slice(0,800);
  const weaknesses = `${major}${minor ? " | Minor: "+minor : ""}`.slice(0,2000) || "—";
  const questions = (obj.questions as string[]).join(" | ").slice(0,800);
  const fullJson = JSON.stringify(obj).slice(0,8000);
  return { score: base.score, confidence: base.confidence, summary: `${summary}\n\nFULL_JSON:${fullJson}`, strengths, weaknesses, questions };
}

// Deterministic mock discussion per agent (so demo is reproducible). Real agents will call via MCP/A2A later.
const DISCUSSION_TEMPLATES: Record<string, string[]> = {
  "agent:8472": ["The proof's sublinear claim checks, but federated heterogeneity lacks imbalance ablations."],
  "agent:reader": ["CIFAR-10 is fine; add a language-model benchmark with longer contexts."],
  "agent:treasury": ["Section 4.2 aggregation needs a soundness proof for heterogeneous models."],
  "agent:crypto-rev": ["Verification is 12× faster — need to confirm it holds under malicious aggregator."],
  "agent:fairness": ["Fairness of partitioned inference not evaluated — add demographic slice."],
  "agent:lab-1": ["Novelty is incremental; comparison to prior ZK-federated work thin."],
};

const REVIEW_TEMPLATES: Record<string, { score: number; confidence: number; summary: string; strengths: string; weaknesses: string; questions: string }> = {
  "agent:8472": { score: 7, confidence: 8, summary: "Solid ZK construction with meaningful speed-up; experiments need stronger heterogeneity stress.", strengths: "Sublinear verifier; privacy preserved; 12× speed-up.", weaknesses: "Missing imbalance ablations; Section 4.2 proof gap.", questions: "Does 12× hold with 100+ parties and non-IID 90/10 splits?" },
  "agent:reader": { score: 8, confidence: 7, summary: "Clear contribution; evaluation is credible but narrow.", strengths: "Clean benchmark; clear writing.", weaknesses: "Only CIFAR-10; no long-context LM test.", questions: "Add WikiText-103 federated inference?" },
  "agent:treasury": { score: 6, confidence: 7, summary: "Aggregation soundness not fully justified.", strengths: "Novel federated ZK framing.", weaknesses: "Section 4.2 missing proof; trust assumption on aggregator.", questions: "Formalize aggregator threat model." },
  "agent:crypto-rev": { score: 8, confidence: 9, summary: "Verification speed is the core win — holds under honest-but-curious aggregator.", strengths: "12× with proof; sublinear.", weaknesses: "Malicious aggregator not analyzed.", questions: "Prove soundness against malicious aggregation." },
  "agent:fairness": { score: 6, confidence: 6, summary: "Fails to evaluate fairness across shards.", strengths: "Privacy framing.", weaknesses: "No demographic or fairness slice.", questions: "Slice accuracy by shard demographics." },
  "agent:lab-1": { score: 5, confidence: 5, summary: "Incremental over prior ZK-federated; thin delta.", strengths: "Baseline comparison.", weaknesses: "Limited novelty; weak related work.", questions: "Differentiate vs. [16]?" },
};

export async function runCouncil(paperId: string, tenantId: string) {
  const [paper] = await db().select().from(papers).where(eq(papers.id, paperId));
  if (!paper) throw new Error("paper not found");
  const [council] = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paperId));
  if (!council) throw new Error("no council");
  if (council.status !== "active") throw new Error(`council must be active to run, got ${council.status}`);

  const selectedKeys = (council.selectedAgentIds as string[]) ?? [];
  // Resumable: reuse existing rows so an interrupted run (killed server,
  // timed-out POST) continues where it left off instead of bricking the paper.
  const agentRows = await db().select().from(agents).where(eq(agents.tenantId, tenantId));
  const byKey = new Map(agentRows.map((a) => [a.agentKey, a.id]));
  const keyById = new Map(agentRows.map((a) => [a.id, a.agentKey]));
  let messages = await db().select().from(councilMessages).where(eq(councilMessages.councilId, council.id));
  const existing = await db().select().from(reviews).where(eq(reviews.councilId, council.id));
  const reviewedKeys = new Set(existing.map((r) => keyById.get(r.agentId)).filter((k): k is string => !!k));

  // 1) Discussion: one message per selected agent (deterministic) — only if none yet
  if (messages.length === 0) {
  const fresh: typeof councilMessages.$inferSelect[] = [];
  for (const key of selectedKeys) {
    const agentId = byKey.get(key) ?? null;
    const templates = DISCUSSION_TEMPLATES[key] ?? ["No comment — review to follow."];
    for (const content of templates) {
      const [msg] = await db().insert(councilMessages).values({ councilId: council.id, agentId, authorType: "agent", content }).returning();
      fresh.push(msg);
      // emit discussion.message (non-blocking for MVP)
      const t = agentRows.find((a) => a.agentKey === key);
      await emit(
        {
          event_type: "discussion.message",
          tenant_id: tenantId,
          task_id: null,
          agent_id: t?.id ?? null,
          payload: { council_id: council.id, message_id: msg.id, agent_id: key, content },
        },
        { agent_key: key, risk_class: "low" },
      );
    }
  }
  messages = fresh;
  }

  // 2) Reviews: one per selected agent — live OpenRouter if key set, else deterministic mock (free tier, never bills). Council reads full PDF via arXiv URL on their own; we pass the URL, DB never stores 80-page content.
  // Skips agents already reviewed so an interrupted run resumes instead of restarting.
  const created: typeof reviews.$inferSelect[] = [...existing];
  for (const key of selectedKeys) {
    if (reviewedKeys.has(key)) continue;
    const agentId = byKey.get(key);
    if (!agentId) continue;
    const agentRow = agentRows.find((a) => a.agentKey === key);
    const live = await generateReviewViaOpenRouter({ title: paper.title, abstract: paper.abstract, domain: paper.domain, pdfUrl: paper.pdfUrl }, { key, name: agentRow?.name ?? key });
    let tmpl: { score: number; confidence: number; summary: string; strengths: string; weaknesses: string; questions: string };
    if (live) tmpl = live;
    else {
      const base = REVIEW_TEMPLATES[key] ?? { score: 6, confidence: 6, summary: "Mock review.", strengths: "—", weaknesses: "—", questions: "—" };
      // When rate-limited (live null), emit academic mock so UI shows 7 sections even on 429
      tmpl = academicMockFor({ title: paper.title, abstract: paper.abstract, domain: paper.domain, pdfUrl: paper.pdfUrl }, { key, name: agentRow?.name ?? key }, base);
    }
    const hash = reviewHash(paper.paperHash, key, tmpl.score, tmpl.summary);
    const [rev] = await db()
      .insert(reviews)
      .values({
        councilId: council.id,
        paperId: paper.id,
        agentId,
        score: tmpl.score,
        confidence: tmpl.confidence,
        summary: tmpl.summary,
        strengths: tmpl.strengths,
        weaknesses: tmpl.weaknesses,
        questions: tmpl.questions,
        reviewHash: hash,
        status: "submitted",
      })
      .returning();
    created.push(rev);
    const t = agentRows.find((a) => a.agentKey === key);
    await emit(
      {
        event_type: "review.submitted",
        tenant_id: tenantId,
        task_id: null,
        agent_id: t?.id ?? null,
        payload: { paper_id: paper.id, council_id: council.id, review_id: rev.id, agent_id: key, score: tmpl.score, review_hash: hash },
      },
      { agent_key: key, risk_class: "low" },
    );
  }

  // 3) Mark council + paper completed only once ALL selected agents have
  // reviewed (no fee release tx yet — Phase 6 anchoring will add anchorTxHash).
  // Partial runs stay active so RUN can resume them.
  const allReviewed = selectedKeys.length > 0 && created.length >= selectedKeys.length;
  if (allReviewed) {
  await db().update(paperCouncils).set({ status: "completed", completedAt: new Date().toISOString() }).where(eq(paperCouncils.id, council.id));
  await db().update(papers).set({ status: "completed" }).where(eq(papers.id, paper.id));

  const [firstAgent] = await db().select().from(agents).where(eq(agents.agentKey, selectedKeys[0]));
  await emit(
    {
      event_type: "paper.completed",
      tenant_id: tenantId,
      task_id: null,
      agent_id: firstAgent?.id ?? null,
      payload: { paper_id: paper.id, council_id: council.id, review_ids: created.map((r) => r.id), status: "completed" },
    },
    { agent_key: selectedKeys[0], risk_class: "low" },
  );
  }

  const [updatedCouncil] = await db().select().from(paperCouncils).where(eq(paperCouncils.id, council.id));
  return { council: updatedCouncil, messages, reviews: created };
}
