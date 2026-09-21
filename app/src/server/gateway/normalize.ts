import type { NormalizedIntent, RiskClass } from "../domain";
import { extractReasoningRef } from "../reasoning/langsmith";

export interface NormalizeInput {
  tool: string;
  args: Record<string, unknown>;
  taskId: string;
}

// plan-02 EXACT mapping — pure; unknown tools fall through to the last row.
export function normalize({ tool, args, taskId }: NormalizeInput): NormalizedIntent {
  const repo = args.repo;
  let action: string;
  let resource: string;
  let risk: RiskClass;
  let amount: number | undefined;

  switch (tool) {
    case "github.get_pull_request":
      action = "get_pull_request";
      resource = `${String(repo)}#${String(args.pr)}`;
      risk = "low";
      break;
    case "github.read_file":
      action = "read_file";
      resource = `${String(repo)}/${String(args.path)}`;
      risk = "low";
      break;
    case "github.merge_pull_request":
      action = "merge_pull_request";
      resource = `${String(repo)}#${String(args.pr)}`;
      risk = "high";
      break;
    case "deploy.production":
      action = "deploy_production";
      resource = `${String(repo)}`;
      risk = "critical";
      break;
    case "scanner.scan":
      if (args.purchase === true) {
        action = "purchase_security_scan";
        resource = `${String(args.target)}`;
        risk = "medium";
        amount = Number(args.price_usd_cents);
        if (!Number.isFinite(amount)) amount = undefined;
      } else {
        action = "scan";
        resource = `${String(args.target)}`;
        risk = "medium";
      }
      break;
    case "task.complete":
      action = "task_complete";
      resource = taskId;
      risk = "low";
      break;
    // plan-11 EXACT treasury rows — classification only (same arg-based
    // precedent as the secret-path rule below). No engine edits: the existing
    // risk-approval rule splits the stake pair on risk_class, and
    // resource_class stays "normal" (no secret/cross-task semantics here).
    case "treasury.swap":
      action = "treasury_swap";
      resource = `treasury/${String(args.asset_pair)}`;
      risk = "high";
      break;
    case "treasury.transfer":
      action = "treasury_transfer";
      resource = `treasury/${String(args.destination)}`;
      risk = "high";
      break;
    case "treasury.stake":
      action = "treasury_stake";
      resource = `treasury/${String(args.protocol)}`;
      risk = Number(args.amount_usd_cents ?? 0) >= 10000 ? "high" : "medium";
      break;
    default:
      action = tool;
      resource = tool;
      risk = "medium";
      break;
  }

  let resource_class: NormalizedIntent["resource_class"] = "normal";
  if (tool === "github.read_file" && String(args.path).startsWith(".env")) {
    resource_class = "secret";
  } else if (repo !== undefined && repo !== "acme/backend") {
    resource_class = "cross_task";
  }

  const intent: NormalizedIntent = { tool, action, resource, risk_class: risk, resource_class };
  if (amount !== undefined) intent.amount_usd_cents = amount;
  // plan-11: client-supplied reasoning link passes through (validated —
  // malformed shapes are dropped, never throw). Rules-only output carries an
  // explicit null (never undefined) per the contract. The LLM-assist path
  // below supersedes it with the fresh run when it succeeds.
  const passthrough = extractReasoningRef(args);
  // plan-13: client-supplied refs are persisted WITH an origin label so the
  // trace can never render them as trusted server links.
  intent.reasoning_ref = passthrough ? { ...passthrough, origin: "client-supplied" as const } : null;
  return intent;
}

export async function normalizeIntent(input: NormalizeInput): Promise<NormalizedIntent> {
  return normalize(input);
}
