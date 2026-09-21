import "./load-env";
import { z } from "zod";
import { logger } from "./logging";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DEMO_TENANT_SLUG: z.string().default("demo"),
  LEDGER_PROVIDER: z.enum(["dev", "ledger"]).default("dev"),
  // RAAC: single network — Base Sepolia only. Hedera fields kept optional for
  // backwards compat during migration, but ignored.
  RAAC_NETWORK: z.enum(["base-sepolia"]).default("base-sepolia"),
  RAAC_CHAIN_ID: z.coerce.number().int().default(84532),
  BASE_SEPOLIA_RPC_URL: z.string().min(1).optional(),
  HEDERA_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  X402_SCANNER_PRICE_CENTS: z.coerce.number().int().default(25),
  X402_DEV_BYPASS: z.enum(["0", "1"]).default("0"),
  X402_SIMULATE_FAILURE: z.enum(["0", "1"]).default("0"),
  AGENT0_SUBGRAPH_URL: z.string().min(1).optional(),
  THEGRAPH_API_KEY: z.string().min(1).optional(),
  LLM_INTENT_PROVIDER: z.string().min(1).optional(),
  GITHUB_TOKEN: z.string().min(1).optional(),
  LEDGER_WALLET_CLI_PATH: z.string().min(1).optional(),
  HEDERA_OPERATOR_ID: z.string().min(1).optional(),
  HEDERA_OPERATOR_KEY: z.string().min(1).optional(),
  APPROVER_PRIVATE_KEYS: z.string().min(1).optional(),
});

export type Config = z.infer<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __cubicConfig: Config | undefined;
  // eslint-disable-next-line no-var
  var __raacConfig: Config | undefined;
}

export function config(): Config {
  if (!globalThis.__cubicConfig && !globalThis.__raacConfig) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    }
    globalThis.__cubicConfig = parsed.data;
    globalThis.__raacConfig = parsed.data;
    // Effective config, once per process: presence-only for secrets, so a
    // misconfigured env shows up in logs instead of failing silently later.
    logger("config").info("effective config", {
      DEMO_TENANT_SLUG: parsed.data.DEMO_TENANT_SLUG,
      LEDGER_PROVIDER: parsed.data.LEDGER_PROVIDER,
      RAAC_NETWORK: parsed.data.RAAC_NETWORK,
      RAAC_CHAIN_ID: parsed.data.RAAC_CHAIN_ID,
      BASE_SEPOLIA_RPC_URL: parsed.data.BASE_SEPOLIA_RPC_URL ? "set" : "unset",
      AGENT0_SUBGRAPH_URL: parsed.data.AGENT0_SUBGRAPH_URL ? "set" : "unset",
      THEGRAPH_API_KEY: parsed.data.THEGRAPH_API_KEY ? "set" : "unset",
      GITHUB_TOKEN: parsed.data.GITHUB_TOKEN ? "set" : "unset",
    });
  }
  return globalThis.__cubicConfig ?? globalThis.__raacConfig!;
}
