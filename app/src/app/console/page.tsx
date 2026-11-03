import { redirect } from "next/navigation";

export default async function ConsoleOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ paper?: string }>;
}) {
  const { paper } = await searchParams;
  redirect(paper ? `/app?paper=${paper}` : "/app");
}
