import { redirect } from "next/navigation";
import { league } from "@/lib/data";

export function generateStaticParams() {
  return league.teams.map((t) => ({ slug: t.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/?tab=teams&team=${encodeURIComponent(slug)}`);
}
