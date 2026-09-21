import { verifyTypedData } from "viem";
import { config } from "../config";

// RAAC EIP-712 domain — single network: Base Sepolia 84532
export const RAAC_DOMAIN = {
  name: "RAAC",
  version: "1",
  chainId: 84532,
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
} as const;

export const RAAC_TYPES = {
  CouncilFormation: [
    { name: "paperId", type: "string" },
    { name: "paperHash", type: "string" },
    { name: "selectionHash", type: "string" },
    { name: "author", type: "address" },
  ],
} as const;

export type CouncilFormationMessage = {
  paperId: string;
  paperHash: string;
  selectionHash: string;
  author: `0x${string}`;
};

export async function verifyCouncilSignature(params: {
  paperId: string;
  paperHash: string;
  selectionHash: string;
  author: `0x${string}`;
  signature: `0x${string}`;
}): Promise<boolean> {
  const chainId = config().RAAC_CHAIN_ID ?? 84532;
  const domain = { ...RAAC_DOMAIN, chainId } as typeof RAAC_DOMAIN;
  return verifyTypedData({
    address: params.author,
    domain,
    types: RAAC_TYPES,
    primaryType: "CouncilFormation",
    message: {
      paperId: params.paperId,
      paperHash: params.paperHash,
      selectionHash: params.selectionHash,
      author: params.author,
    },
    signature: params.signature,
  });
}

export function councilFormationMessage(paperId: string, paperHash: string, selectionHash: string, author: `0x${string}`): CouncilFormationMessage {
  return { paperId, paperHash, selectionHash, author };
}
