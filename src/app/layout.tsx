import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/i18n";

export const metadata: Metadata = {
  title: {
    default: "NBA Salary Tracker — チームサラリー完全追跡",
    template: "%s · NBA Salary Tracker",
  },
  description:
    "NBA 30チームのペイロール、ラグジュアリータックス、第1・第2エプロン、将来の契約コミット、契約満了選手をまとめて追跡できるダッシュボード。",
  applicationName: "NBA Salary Tracker",
  openGraph: {
    title: "NBA Salary Tracker — チームサラリー完全追跡",
    description:
      "NBA 30チームのペイロール・ラグジュアリータックス・エプロン・将来契約・満了選手を1サイトに。チーム比較クイズも。",
    siteName: "NBA Salary Tracker",
    type: "website",
    locale: "ja_JP",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary",
    title: "NBA Salary Tracker — チームサラリー完全追跡",
    description: "NBA 30チームのペイロールとタックスをまとめて追跡。比較・クイズ付き。",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
