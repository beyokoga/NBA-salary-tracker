import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const team = typeof sp.team === "string" ? sp.team : "";
  redirect(team ? `/?tab=tax&team=${encodeURIComponent(team)}` : "/?tab=tax");
}
