import "./load-env";
import { z } from "zod";
import { logger } from "./logging";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DEMO_TENANT_SLUG: z.string().default("demo"),
  // RAAC: single network — Base Sepolia only.
  RAAC_NETWORK: z.enum(["base-sepolia"]).default("base-sepolia"),
  RAAC_CHAIN_ID: z.coerce.number().int().default(84532),
  BASE_SEPOLIA_RPC_URL: z.string().min(1).optional(),
  BASE_SEPOLIA_PRIVATE_KEY: z.string().min(1).optional(),
  AGENT0_SUBGRAPH_URL: z.string().min(1).optional(),
  THEGRAPH_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY_2: z.string().min(1).optional(),
  OPENROUTER_API_KEYS: z.string().min(1).optional(),
  CHAT_MODEL: z.string().min(1).optional(),
});

export type Config = z.infer<typeof schema>;

declare global {
  var __raacConfig: Config | undefined;
}

export function config(): Config {
  if (!globalThis.__raacConfig) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    }
    globalThis.__raacConfig = parsed.data;
    // Effective config, once per process: presence-only for secrets, so a
    // misconfigured env shows up in logs instead of failing silently later.
    logger("config").info("effective config", {
      DEMO_TENANT_SLUG: parsed.data.DEMO_TENANT_SLUG,
      RAAC_NETWORK: parsed.data.RAAC_NETWORK,
      RAAC_CHAIN_ID: parsed.data.RAAC_CHAIN_ID,
      BASE_SEPOLIA_RPC_URL: parsed.data.BASE_SEPOLIA_RPC_URL ? "set" : "unset",
      BASE_SEPOLIA_PRIVATE_KEY: parsed.data.BASE_SEPOLIA_PRIVATE_KEY ? "set" : "unset",
      AGENT0_SUBGRAPH_URL: parsed.data.AGENT0_SUBGRAPH_URL ? "set" : "unset",
      THEGRAPH_API_KEY: parsed.data.THEGRAPH_API_KEY ? "set" : "unset",
      OPENROUTER_API_KEY: parsed.data.OPENROUTER_API_KEY ? "set" : "unset",
      OPENROUTER_API_KEY_2: parsed.data.OPENROUTER_API_KEY_2 ? "set" : "unset",
      OPENROUTER_API_KEYS: parsed.data.OPENROUTER_API_KEYS ? "set" : "unset",
      CHAT_MODEL: parsed.data.CHAT_MODEL ? parsed.data.CHAT_MODEL : "unset",
    });
  }
  return globalThis.__raacConfig;
}
