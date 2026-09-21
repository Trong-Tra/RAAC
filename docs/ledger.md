# Ledger / signatures — RAAC note

> **Cubic-era Ledger doc is archived.** This file is the RAAC authority note.

- Cubic used `LEDGER_PROVIDER=dev|ledger`, `wallet-cli ring`, and a `SecretProtector` seam for payment authority keys. All of it is **deprecated for RAAC** — do not extend `app/src/server/ledger/` or reintroduce `HEDERA_OPERATOR_KEY` handling.
- RAAC's gate is **author signature on council formation**, not ledger-gated approvals. Author signs EIP-712 `RAAC Council Formation` over `selection_hash` + `paper_hash`. Verification is via `viem verifyTypedData` against the author's Base Sepolia address.
- No hardware path in RAAC MVP. If human-in-loop approval returns (e.g., fee dispute), define a new `signer` model — do not resurrect `LedgerKeyRingProvider`.

The old content (wallet-cli v2.1.0 spike, Key Ring blocked without device, boot gate, Hedera rotation runbook, HCS topic `0.0.10517868`) is kept in git history pre-rip for audit, not authoritative.
