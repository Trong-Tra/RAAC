import { describe, expect, it } from "vitest";

const savedUrl = process.env.DATABASE_URL;

describe("config", () => {
  it("throws containing DATABASE_URL when unset", async () => {
    delete process.env.DATABASE_URL;
    delete globalThis.__raacConfig;
    const { config } = await import("../src/server/config");
    expect(() => config()).toThrow(/DATABASE_URL/);
  });
});

describe("config after restore", () => {
  it("parses with DATABASE_URL set and Base Sepolia defaults", async () => {
    process.env.DATABASE_URL = savedUrl;
    delete globalThis.__raacConfig;
    const { config } = await import("../src/server/config");
    expect(config().DATABASE_URL).toBe(savedUrl);
    expect(config().RAAC_NETWORK).toBe("base-sepolia");
    expect(config().RAAC_CHAIN_ID).toBe(84532);
  });
});
