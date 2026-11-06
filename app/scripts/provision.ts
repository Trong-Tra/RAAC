import "../src/server/load-env";
import { seedRoster } from "../src/server/demo/seed";

async function main(): Promise<void> {
  const { agents } = await seedRoster();
  console.log(`provision: tenant + roster ready (${agents} agents)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
