// Shared EIP-712 helpers for council formation — used by browser (sign) and server (verify) so bytes are identical.
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
