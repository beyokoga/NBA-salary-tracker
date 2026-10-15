import Link from "next/link";
import { Shell } from "@/components/Shell";

export default function NotFound() {
  return (
    <Shell>
    <div className="panel mx-auto max-w-lg px-6 py-14 text-center">
      <div className="tnum text-5xl font-black text-amber">404</div>
      <h1 className="mt-3 text-lg font-bold text-chalk">ページが見つかりません / Page not found</h1>
      <p className="mt-2 text-sm text-fog">
        存在しないチームまたはページの可能性があります。
        <br />
        The team or page you asked for does not exist.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/" className="btn">
          ダッシュボード
        </Link>
        <Link href="/teams" className="btn">
          チーム一覧
        </Link>
      </div>
    </div>
    </Shell>
  );
}
