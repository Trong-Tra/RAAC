import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { config } from "../config";
import { db } from "../db/client";
import { reviews, paperCouncils } from "../db/schema";
import { eq } from "drizzle-orm";
import { emit } from "../events/bus";

function getWallet() {
  const key = config().BASE_SEPOLIA_PRIVATE_KEY;
  if (!key) throw new Error("BASE_SEPOLIA_PRIVATE_KEY not set — add funded 84532 key to app/.env.local");
  const rpc = config().BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
  const account = privateKeyToAccount(key as `0x${string}`);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(rpc), account });
  return { account, publicClient, walletClient };
}

export async function anchorReviewsForPaper(paperId: string, tenantId: string) {
  const [council] = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paperId));
  if (!council) throw new Error("no council for paper");
  const revs = await db().select().from(reviews).where(eq(reviews.councilId, council.id));
  if (revs.length === 0) throw new Error("no reviews to anchor");
  const pending = revs.filter((r) => !r.anchorTxHash);
  if (pending.length === 0) return { anchored: [], already: revs };

  const { account, publicClient, walletClient } = getWallet();

  const anchored: typeof revs = [];
  for (const rev of pending) {
    // Send self-tx with review hash as data (0 value, 84532)
    // data = 0x + reviewHash (32 bytes) — verifiable on Basescan
    const data = `0x${rev.reviewHash}` as `0x${string}`;
    const hash = await walletClient.sendTransaction({
      to: account.address,
      value: BigInt(0),
      data,
    });
    // Wait for receipt (optional, but ensures inclusion before returning Basescan link)
    await publicClient.waitForTransactionReceipt({ hash });
    const [updated] = await db().update(reviews).set({ anchorTxHash: hash, status: "anchored" }).where(eq(reviews.id, rev.id)).returning();
    anchored.push(updated);

    await emit(
      {
        event_type: "review.submitted",
        tenant_id: tenantId,
        task_id: null,
        agent_id: rev.agentId,
        payload: { paper_id: paperId, council_id: council.id, review_id: rev.id, agent_id: rev.agentId, score: rev.score, review_hash: rev.reviewHash, anchor_tx: hash },
      },
      { agent_key: council.selectedAgentIds[0] as string, risk_class: "low" },
    );
  }

  return { anchored, already: revs.filter((r) => r.anchorTxHash) };
}

export function basescanTxUrl(txHash: string): string {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}
