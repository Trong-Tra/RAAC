import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config";
import * as schema from "./schema";

declare global {
  var __raacDb: ReturnType<typeof makeDb> | undefined;
}

function makeDb() {
  const client = postgres(config().DATABASE_URL, { max: 5 });
  return drizzle(client, { schema });
}

export function db() {
  if (!globalThis.__raacDb) globalThis.__raacDb = makeDb();
  return globalThis.__raacDb;
}
