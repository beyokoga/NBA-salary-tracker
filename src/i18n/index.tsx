"use client";

import { useEffect, createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/types";

type Entry = { ja: string; en: string };

export const DICT = {
  // ---- shell -------------------------------------------------------------
  "app.name": { ja: "NBAサラリートラッカー", en: "NBA Salary Tracker" },
  "app.tagline": {
    ja: "30チームのペイロール・ラグジュアリータックス・将来契約をまとめて追跡",
    en: "Payrolls, luxury tax and future commitments for all 30 NBA teams",
  },
  "nav.dashboard": { ja: "ダッシュボード", en: "Dashboard" },
  "nav.teams": { ja: "チーム一覧", en: "Teams" },
  "nav.players": { ja: "選手年俸", en: "Players" },
  "nav.tax": { ja: "タックス試算", en: "Tax Lab" },
  "nav.freeAgency": { ja: "契約満了・FA", en: "Expirings & FA" },
  "nav.capHistory": { ja: "キャップ推移", en: "Cap History" },
  "nav.compare": { ja: "比較", en: "Compare" },
  "nav.news": { ja: "ニュース", en: "News" },
  "news.title": { ja: "新規契約・トレード・リーグニュース", en: "Signings, trades & league news" },
  "news.sub": {
    ja: "ESPN 公開トランザクションフィード（直近{days}日）。各エントリーは ESPN 原文（英語）をそのまま掲載しています。",
    en: "ESPN's public transaction feed (last {days} days). Entries appear in ESPN's original English.",
  },
  "news.fetched": { ja: "取得", en: "Fetched" },
  "news.all": { ja: "すべて", en: "All" },
  "news.contracts": { ja: "新規契約", en: "Signings" },
  "news.trades": { ja: "トレード", en: "Trades" },
  "news.other": { ja: "その他の動き", en: "Other moves" },
  "news.headlines": { ja: "リーグ見出し", en: "League headlines" },
  "news.teamAll": { ja: "全チーム", en: "All teams" },
  "news.empty": { ja: "この期間・条件に該当する動きはありません", en: "No matching moves in this window" },
  "news.count": { ja: "{n}件", en: "{n} items" },
  "news.cat.signing": { ja: "新規契約", en: "Signing" },
  "news.cat.trade": { ja: "トレード", en: "Trade" },
  "news.cat.twoWay": { ja: "ツーウェイ/10日", en: "Two-way/10-day" },
  "news.cat.waiver": { ja: "ウェーバー/放出", en: "Waived/released" },
  "news.cat.claim": { ja: "クレーム", en: "Claimed" },
  "news.cat.other": { ja: "その他", en: "Other" },
  "nav.menu": { ja: "メニュー", en: "Menu" },
  "common.close": { ja: "閉じる", en: "Close" },
  "common.back": { ja: "戻る", en: "Back" },
  "common.all": { ja: "すべて", en: "All" },
  "common.search": { ja: "検索", en: "Search" },
  "common.sort": { ja: "並び替え", en: "Sort" },
  "common.total": { ja: "合計", en: "Total" },
  "common.rank": { ja: "順位", en: "Rank" },
  "common.team": { ja: "チーム", en: "Team" },
  "common.player": { ja: "選手", en: "Player" },
  "common.season": { ja: "シーズン", en: "Season" },
  "common.loading": { ja: "読み込み中…", en: "Loading…" },
  "common.swipe": { ja: "⇄ 横にスワイプでスクロール", en: "⇄ swipe sideways to scroll" },
  "common.viewAll": { ja: "すべて見る", en: "View all" },
  "common.noResults": { ja: "該当するデータがありません", en: "No matches" },
  "common.showing": { ja: "{n} 件中 {a}–{b} 件を表示", en: "Showing {a}–{b} of {n}" },
  "common.estimate": { ja: "推計", en: "estimate" },
  "common.vsPrev": { ja: "前季比", en: "vs prior season" },
  "common.above": { ja: "超過", en: "above" },
  "common.below": { ja: "下回る", en: "below" },
  "common.perDollar": { ja: "/ 1ドルあたり", en: "per $1 over" },

  // ---- dashboard ---------------------------------------------------------
  "dash.hero": { ja: "{season} シーズン 給与総額スナップショット", en: "{season} payroll snapshot" },
  "dash.snapshot": { ja: "ロスター基準日 {date}", en: "Roster snapshot {date}" },
  "dash.updated": { ja: "データ更新 {date}", en: "Data updated {date}" },
  "dash.leaguePayroll": { ja: "リーグ総年俸", en: "League payroll" },
  "dash.avgPayroll": { ja: "平均ペイロール", en: "Average payroll" },
  "dash.taxpayers": { ja: "タックス超過チーム", en: "Taxpayer teams" },
  "dash.taxCollected": { ja: "タックス推計総額", en: "Estimated tax collected" },
  "dash.avgSalary": { ja: "平均年俸", en: "Average salary" },
  "dash.medianSalary": { ja: "年俸中央値", en: "Median salary" },
  "dash.playerCount": { ja: "対象選手", en: "Players tracked" },
  "dash.underCap": { ja: "キャップ未満", en: "Under the cap" },
  "dash.distribution": { ja: "ペイロール分布", en: "Payroll distribution" },
  "dash.distributionSub": {
    ja: "バーは2026-27のキャップ計上額。縦線はキャップ／タックスライン／第1・第2エプロン。",
    en: "Bars show 2026-27 cap payroll. Lines mark the cap, tax level and both aprons.",
  },
  "dash.efficiency": { ja: "支出と勝利の関係", en: "Spending vs. winning" },
  "dash.efficiencySub": {
    ja: "横軸＝{prev}の勝率、縦軸＝{season}ペイロール。右上ほど「高く買って強い」。",
    en: "X = {prev} win%, Y = {season} payroll. Top-right means spending and winning.",
  },
  "dash.topSalaries": { ja: "最高年俸トップ10", en: "Top 10 salaries" },
  "dash.topSalariesSub": { ja: "キャップ計上額ベース", en: "By cap charge" },
  "dash.champion": { ja: "{season} チャンピオン", en: "{season} champion" },
  "dash.finals": { ja: "ファイナル", en: "NBA Finals" },
  "dash.finalsMvp": { ja: "ファイナルMVP", en: "Finals MVP" },
  "dash.playoffResults": { ja: "プレーオフ結果", en: "Playoff results" },
  "dash.awards": { ja: "{season} 主要タイトル", en: "{season} awards" },
  "dash.taxDistribution": { ja: "タックス分配（非課税チーム1チームあたり推計）", en: "Tax distribution per non-taxpayer (est.)" },
  "dash.leagueLines": { ja: "{season} サラリーキャップ基準額", en: "{season} salary cap thresholds" },
  "dash.leagueLinesSub": {
    ja: "NBAが公式発表した額。キャップ上昇はCBAで年10%までに制限されている（キャップスムージング）。",
    en: "Officially announced by the NBA. Cap growth is limited to 10% a year under the CBA's smoothing rule.",
  },
  "dash.highest": { ja: "最高額", en: "Highest" },
  "dash.lowest": { ja: "最低額", en: "Lowest" },
  "dash.spread": { ja: "高低差", en: "Spread" },

  // ---- thresholds --------------------------------------------------------
  "th.floor": { ja: "最低給与ライン", en: "Salary floor" },
  "th.cap": { ja: "サラリーキャップ", en: "Salary cap" },
  "th.tax": { ja: "ラグジュアリータックスライン", en: "Luxury tax line" },
  "th.apron1": { ja: "第1エプロン", en: "First apron" },
  "th.apron2": { ja: "第2エプロン", en: "Second apron" },
  "th.mleNonTax": { ja: "ノンタックスペイヤーMLE", en: "Non-taxpayer MLE" },
  "th.mleTax": { ja: "タックスペイヤーMLE", en: "Taxpayer MLE" },
  "th.roomMle": { ja: "ルームMLE", en: "Room MLE" },
  "th.bae": { ja: "隔年例外（BAE）", en: "Bi-annual exception" },
  "th.max0_6": { ja: "マックス（在籍6年以下）", en: "Max salary (0-6 yrs service)" },
  "th.max7_9": { ja: "マックス（在籍7–9年）", en: "Max salary (7-9 yrs service)" },
  "th.max10": { ja: "マックス（在籍10年以上）", en: "Max salary (10+ yrs service)" },
  "th.bracket": { ja: "ブラケット税の刻み幅", en: "Tax bracket increment" },
  "th.earlyBird": { ja: "アーリーバード例外", en: "Early Bird exception" },
  "th.estAvgSalary": { ja: "推定平均年俸", en: "Estimated average salary" },
  "th.exhibit10": { ja: "Exhibit 10 上限ボーナス", en: "Max Exhibit 10 bonus" },
  "th.tradeCashLimit": { ja: "トレードで送れる現金上限", en: "Trade cash limit" },
  "th.expandedTpe": { ja: "拡大トレード例外（TPE）", en: "Expanded traded player exception" },
  "th.twoWay": { ja: "ツーウェイ契約年俸", en: "Two-way salary" },
  "th.floorNote": {
    ja: "リーグ開幕時点でこの額に届かないチームは差額をNBAに支払い、タックス分配の満額を受け取れない。",
    en: "Teams below this on opening night pay the shortfall to the league and forfeit a full tax distribution share.",
  },
  "th.apron1Note": {
    ja: "特定の例外を使うとこの額がハードキャップになる。越えると補強手段が一気に減る。",
    en: "Becomes a hard cap once certain exceptions are used. Crossing it strips roster-building tools.",
  },
  "th.apron2Note": {
    ja: "事実上のハードキャップ。越えるとMLE消失・指名権凍結など最も重いペナルティが発動する。",
    en: "A de facto hard cap: losing the MLE, frozen draft picks and the heaviest penalties.",
  },

  // ---- team table --------------------------------------------------------
  "team.payroll": { ja: "ペイロール", en: "Payroll" },
  "team.capShare": { ja: "キャップ比", en: "% of cap" },
  "team.deadCap": { ja: "デッドキャップ", en: "Dead cap" },
  "team.capHolds": { ja: "キャップホールド", en: "Cap holds" },
  "team.cash": { ja: "現金支給額", en: "Cash paid" },
  "team.rosterCount": { ja: "人数", en: "Players" },
  "team.delta": { ja: "前季比", en: "Change" },
  "team.taxSalary": { ja: "タックス対象額", en: "Tax salary" },
  "team.apronSalary": { ja: "エプロン対象額", en: "Apron salary" },
  "team.overTax": { ja: "タックス超過額", en: "Over tax" },
  "team.taxEstimate": { ja: "タックス推計", en: "Tax (est.)" },
  "team.capSpace": { ja: "キャップスペース", en: "Cap space" },
  "team.status": { ja: "状況", en: "Status" },
  "team.topPlayer": { ja: "最高年俸選手", en: "Top salary" },
  "team.top3Share": { ja: "上位3人占有率", en: "Top-3 share" },
  "team.conference": { ja: "カンファレンス", en: "Conference" },
  "team.division": { ja: "ディビジョン", en: "Division" },
  "team.record": { ja: "昨季戦績", en: "Last season" },
  "team.seed": { ja: "シード", en: "Seed" },
  "team.result": { ja: "昨季結果", en: "Result" },
  "team.repeater": { ja: "リピーター", en: "Repeater" },
  "team.repeaterShort": { ja: "REP", en: "REP" },
  "team.searchPlaceholder": { ja: "チーム名で検索…", en: "Search teams…" },
  "team.filterConference": { ja: "カンファレンス", en: "Conference" },
  "team.eastern": { ja: "イースト", en: "East" },
  "team.western": { ja: "ウェスト", en: "West" },
  "team.statusFilter": { ja: "タックス状況", en: "Tax status" },
  "team.title": { ja: "30チーム ペイロール比較", en: "All 30 payrolls" },
  "team.subtitle": {
    ja: "キャップ計上額ベースの順位。列見出しをクリックで並び替えできます。",
    en: "Ranked by cap payroll. Click any column header to sort.",
  },

  "apron.second": { ja: "第2エプロン超", en: "Above 2nd apron" },
  "apron.first": { ja: "第1エプロン超", en: "Above 1st apron" },
  "apron.tax": { ja: "タックス超過", en: "Taxpayer" },
  "apron.belowTax": { ja: "タックス未満", en: "Below tax" },
  "apron.underCap": { ja: "キャップ未満", en: "Under cap" },

  "compare.title": { ja: "チーム比較", en: "Team comparison" },
  "compare.sub": {
    ja: "2〜3チームを選んで、ペイロール・タックス・将来の拘束年俸を横比べ。URLで比較状態を共有できます。",
    en: "Pick 2-3 teams to compare payroll, luxury tax and future commitments side by side. The comparison is shareable via URL.",
  },
  "compare.share": { ja: "共有URLをコピー", en: "Copy share URL" },
  "compare.copied": { ja: "コピーしました", en: "Copied!" },
  "compare.add": { ja: "+ チームを追加", en: "+ Add team" },
  "compare.remove": { ja: "外す", en: "Remove" },
  "compare.team": { ja: "チーム", en: "Team" },
  "compare.rank": { ja: "ペイロール", en: "Payroll" },
  "compare.record": { ja: "2025-26 成績", en: "2025-26 record" },
  "compare.top": { ja: "最高年俸", en: "Top salary" },
  "compare.payroll": { ja: "ペイロール（2026-27・デッド込み）", en: "Payroll (2026-27, incl. dead)" },
  "compare.tax": { ja: "ラグジュアリータックス推計", en: "Luxury tax (est.)" },
  "compare.allIn": { ja: "エプロン加算税込み", en: "all-in incl. surcharges" },
  "compare.expiring": { ja: "今季満了契約", en: "Expiring after this season" },
  "compare.contracts": { ja: "件", en: "contracts" },
  "compare.dead": { ja: "デッドマネー合計", en: "Dead money total" },
  "compare.holds": { ja: "うちホールド", en: "holds" },
  "compare.cpw": { ja: "1勝あたりコスト（2025-26）", en: "Cost per win (2025-26)" },
  "compare.future": { ja: "将来の確定年俸", en: "Committed future payroll" },
  "compare.futureSub": {
    ja: "シーズン開始時点で契約確定済みの年俸合計（オプション行使前は含まれない場合あり）。",
    en: "Salaries already guaranteed per season (options not yet exercised may be excluded).",
  },

  "result.champion": { ja: "優勝", en: "Champion" },
  "result.finals": { ja: "ファイナル出場", en: "Finals" },
  "result.confFinals": { ja: "カンファレンス決勝", en: "Conf. finals" },
  "result.confSemis": { ja: "カンファレンス準決勝", en: "Conf. semis" },
  "result.firstRound": { ja: "1回戦敗退", en: "First round" },
  "result.missed": { ja: "プレーオフ不出場", en: "Missed" },

  // ---- team detail -------------------------------------------------------
  "detail.heroSub": { ja: "{conf} ・ {div} ディビジョン", en: "{conf} Conference · {div} Division" },
  "detail.activePayroll": { ja: "現ロスターのキャップ計上額", en: "Active cap payroll" },
  "detail.inclDead": { ja: "デッドキャップ込み", en: "Incl. dead cap" },
  "detail.leagueRank": { ja: "リーグ{rank}位 / 30チーム", en: "#{rank} of 30 teams" },
  "detail.position": { ja: "キャップポジション", en: "Cap position" },
  "detail.comp": { ja: "ペイロールの内訳", en: "Payroll composition" },
  "detail.taxSalary": { ja: "課税対象サラリー", en: "Tax salary" },
  "detail.apronSalary": { ja: "エプロン算定サラリー", en: "Apron salary" },
  "detail.positionSub": {
    ja: "各ラインとの距離。タックスラインは「タックス対象額」、エプロンは「エプロン対象額」で判定します。",
    en: "Distance to each line. The tax level uses tax salary; the aprons use apron salary.",
  },
  "detail.room": { ja: "{line} まで {amount}", en: "{amount} to {line}" },
  "detail.over": { ja: "{line} を {amount} 超過", en: "{amount} over {line}" },
  "detail.taxBill": { ja: "ラグジュアリータックス試算", en: "Luxury tax bill" },
  "detail.taxBillSub": {
    ja: "ブラケット税は各 tracker が公表する値と同じ計算式。エプロン加算税はCBA上の別建てペナルティで、多くの公表値には含まれません。",
    en: "Bracket tax matches what public trackers quote. Apron surcharges are a separate CBA penalty most quotes exclude.",
  },
  "detail.bracketTax": { ja: "ブラケット税", en: "Bracket tax" },
  "detail.apronSurcharge": { ja: "エプロン加算税", en: "Apron surcharges" },
  "detail.totalTax": { ja: "合計", en: "Total" },
  "detail.published": { ja: "公表推計値", en: "Published estimate" },
  "detail.effective": { ja: "実効税率", en: "Effective rate" },
  "detail.repeaterStatus": { ja: "リピーター判定（直近4シーズン）", en: "Repeater status (last 4 seasons)" },
  "detail.repeaterYes": {
    ja: "直近4季中{n}季でタックス超過 → リピーター税率が適用されます（各ブラケット +$2.00）。",
    en: "Taxpayer in {n} of the last 4 seasons → repeater rates apply (+$2.00 in every bracket).",
  },
  "detail.repeaterNo": {
    ja: "直近4季中{n}季でタックス超過 → 標準税率が適用されます。3季以上でリピーター扱い。",
    en: "Taxpayer in {n} of the last 4 seasons → standard rates. Three or more makes a repeater.",
  },
  "detail.taxpayer": { ja: "タックス超過", en: "Taxpayer" },
  "detail.belowTax": { ja: "タックス未満", en: "Below tax" },
  "detail.bracket": { ja: "ブラケット", en: "Bracket" },
  "detail.band": { ja: "超過額帯", en: "Overage band" },
  "detail.rate": { ja: "税率", en: "Rate" },
  "detail.taxOnBand": { ja: "税額", en: "Tax" },
  "detail.roster": { ja: "ロスター年俸明細", en: "Roster salaries" },
  "detail.rosterSub": {
    ja: "{n}件のスタンダード契約。行をクリックすると契約の詳細が開きます。",
    en: "{n} standard contracts. Click a row to expand contract details.",
  },
  "detail.history": { ja: "ペイロール推移", en: "Payroll history" },
  "detail.historySub": {
    ja: "過去シーズンは当時のキャップ計上額。線はその年のキャップとタックスライン。",
    en: "Past seasons use historical cap payroll; lines show that year's cap and tax level.",
  },
  "detail.future": { ja: "将来の契約コミット", en: "Future commitments" },
  "detail.futureSub": {
    ja: "現行契約で確定している年ごとのキャップ計上額。PO＝プレイヤーオプション、TO＝チームオプション。",
    en: "Scheduled cap charges from current deals. PO = player option, TO = team option.",
  },
  "detail.scheduled": { ja: "確定額合計", en: "Scheduled" },
  "detail.scheduledNoPo": { ja: "PO行使前提を除く合計", en: "Excluding player options" },
  "detail.futureLeagueRank": { ja: "リーグ比較（{season}）", en: "League ranking ({season})" },
  "detail.contracts": { ja: "契約年数の分布", en: "Contract length" },
  "detail.contractsSub": {
    ja: "ロスターの契約がいつまで続いているか。棒は該当シーズンに契約が残る人数。",
    en: "How long the roster is locked in. Bars count players under contract in each season.",
  },
  "detail.expiring": { ja: "今季で満了する契約", en: "Expiring after this season" },
  "detail.expiringSub": {
    ja: "来夏にオフになれる（またはオプションを持つ）選手と、消える年俸。",
    en: "Players who can hit free agency next summer, and the salary coming off the books.",
  },
  "detail.rivals": { ja: "ディビジョン内の比較", en: "Division rivals" },
  "detail.recordTitle": { ja: "{season} レギュラーシーズン成績", en: "{season} regular season" },
  "detail.simulate": { ja: "このチームでタックス試算を開く", en: "Open in the tax lab" },
  "detail.note": { ja: "データ出典", en: "Source" },
  "detail.notFound": { ja: "チームが見つかりません", en: "Team not found" },
  "detail.switchTeam": { ja: "他チームを見る", en: "Browse teams" },

  "pos.payrollShare": { ja: "チーム内占有率", en: "Share of payroll" },
  "pos.age": { ja: "年齢", en: "Age" },
  "pos.height": { ja: "身長", en: "Height" },
  "pos.country": { ja: "国籍", en: "Country" },
  "pos.position": { ja: "ポジション", en: "Position" },
  "pos.salary": { ja: "{season} 年俸", en: "{season} salary" },
  "pos.salaryPrev": { ja: "前季年俸", en: "Prior season" },
  "pos.capHit": { ja: "キャップヒット", en: "Cap hit" },
  "pos.capShare": { ja: "キャップ占有率", en: "Share of cap" },
  "pos.contractValue": { ja: "契約総額", en: "Contract value" },
  "pos.guaranteed": { ja: "保証額", en: "Guaranteed" },
  "pos.contractType": { ja: "契約種別", en: "Contract type" },
  "pos.contractThrough": { ja: "契約満了", en: "Through" },
  "pos.option": { ja: "オプション", en: "Option" },
  "pos.freeAgency": { ja: "FAになる年", en: "Free agency" },
  "pos.careerEarnings": { ja: "通算収入", en: "Career earnings" },
  "pos.netWorth": { ja: "純資産（推計）", en: "Net worth (est.)" },
  "pos.optionNone": { ja: "なし", en: "None" },

  // ---- players -----------------------------------------------------------
  "players.title": { ja: "選手年俸ランキング", en: "Player salaries" },
  "players.subtitle": {
    ja: "{season} のスタンダード契約 {n} 件。検索・ポジション・チームで絞り込めます。",
    en: "{n} standard contracts for {season}. Search, then filter by position or team.",
  },
  "players.searchPlaceholder": { ja: "選手名で検索…", en: "Search players…" },
  "players.filterPos": { ja: "ポジション", en: "Position" },
  "players.filterTeam": { ja: "チーム", en: "Team" },
  "players.filterContract": { ja: "契約種別", en: "Contract" },
  "players.maxOnly": { ja: "マックス契約のみ", en: "Max contracts only" },
  "players.optionOnly": { ja: "オプション保有のみ", en: "Has an option year" },
  "players.expCount": { ja: "{n} 人が条件に一致", en: "{n} players match" },
  "players.topContracts": { ja: "契約総額トップ", en: "Largest contracts" },
  "players.ageSalary": { ja: "年齢 × 年俸", en: "Age vs. salary" },
  "players.ageSalarySub": {
    ja: "右下ほど「若くて高い」＝コスパの良い契約。左上はベテラン大型契約。",
    en: "Bottom-right is young and expensive (good value); top-left is veteran money.",
  },
  "players.byType": { ja: "契約種別ごとの総額", en: "Payroll by contract type" },
  "players.leaderSub": { ja: "1位との差", en: "Gap to #1" },

  // ---- tax lab -----------------------------------------------------------
  "tax.title": { ja: "ラグジュアリータックス試算", en: "Luxury tax lab" },
  "tax.subtitle": {
    ja: "ペイロールを動かすと、ブラケット税・エプロン加算税・実効税率がその場で計算されます。",
    en: "Move the payroll and watch the bracket tax, apron surcharges and effective rate update live.",
  },
  "tax.team": { ja: "対象チーム", en: "Team" },
  "tax.useTeamActual": { ja: "実際のペイロールに戻す", en: "Reset to actual payroll" },
  "tax.customPayroll": { ja: "タックス対象額", en: "Tax salary" },
  "tax.repeater": { ja: "リピーター税率を適用", en: "Apply repeater rates" },
  "tax.repeaterHint": {
    ja: "直近4シーズンのうち3シーズン以上でタックスラインを超えたチームに適用。",
    en: "Applies to teams above the tax level in 3 of the previous 4 seasons.",
  },
  "tax.includeApron": { ja: "エプロン加算税を含める", en: "Include apron surcharges" },
  "tax.result": { ja: "試算結果", en: "Result" },
  "tax.overage": { ja: "タックスライン超過額", en: "Amount over the tax line" },
  "tax.bill": { ja: "タックス額", en: "Tax bill" },
  "tax.totalCost": { ja: "人件費＋タックス", en: "Payroll + tax" },
  "tax.perExtra": { ja: "あと1ドル増やすと", en: "Cost of the next dollar" },
  "tax.marginal": { ja: "限界税率", en: "Marginal rate" },
  "tax.bracketTable": { ja: "ブラケット内訳", en: "Bracket breakdown" },
  "tax.ratesStandard": { ja: "標準税率", en: "Standard rates" },
  "tax.ratesRepeater": { ja: "リピーター税率", en: "Repeater rates" },
  "tax.curve": { ja: "タックス額カーブ", en: "Tax curve" },
  "tax.curveSub": {
    ja: "タックスラインから第2エプロン+20Mまでの範囲。点線は現在の位置。",
    en: "From the tax line to second apron + $20M. The dashed line is the current position.",
  },
  "tax.leagueBills": { ja: "リーグ全体のタックス負担", en: "League-wide tax burden" },
  "tax.leagueBillsSub": {
    ja: "ブラケット税の合計。非課税チームにはこの50%が均等分配されます。",
    en: "Bracket tax totals. Half of it is redistributed evenly to non-taxpayer teams.",
  },
  "tax.restrictions": { ja: "エプロンによる制限", en: "Apron restrictions" },
  "tax.restrictionsFirst": { ja: "第1エプロンを超えると", en: "Above the first apron" },
  "tax.restrictionsSecond": { ja: "第2エプロンを超えると（上記に加えて）", en: "Above the second apron (all of the above, plus)" },
  "tax.scenarios": { ja: "シナリオ", en: "Scenarios" },
  "tax.scenario.duck": { ja: "タックス回避（ライン直下まで削減）", en: "Duck the tax (cut to just under)" },
  "tax.scenario.toApron1": { ja: "第1エプロンまで増額", en: "Spend to the first apron" },
  "tax.scenario.toApron2": { ja: "第2エプロンまで増額", en: "Spend to the second apron" },
  "tax.scenario.plus10": { ja: "+$10M 上乗せ", en: "Add $10M" },
  "tax.scenario.minus10": { ja: "−$10M 削減", en: "Cut $10M" },
  "tax.saved": { ja: "節税額", en: "Tax saved" },
  "tax.extraCost": { ja: "追加コスト", en: "Extra cost" },
  "tax.noTax": { ja: "タックスライン未満のため課税なし", en: "Below the tax line — no tax owed" },

  // ---- free agency -------------------------------------------------------
  "fa.title": { ja: "契約満了とオプション", en: "Expiring contracts & options" },
  "fa.subtitle": {
    ja: "{season} で満了する契約と、選手／チームオプションが付いている最終年を一覧化。",
    en: "Deals ending after {season}, plus final years carrying a player or team option.",
  },
  "fa.totalExpiring": { ja: "今夏オフになれる年俸総額", en: "Salary coming off the books" },
  "fa.count": { ja: "該当契約数", en: "Contracts" },
  "fa.teams": { ja: "影響チーム数", en: "Teams affected" },
  "fa.byTeam": { ja: "チーム別オフ額", en: "Expiring salary by team" },
  "fa.byTeamSub": {
    ja: "大きいほど来夏の柔軟性が高い一方、再契約コストも膨らむ。",
    en: "Bigger bars mean more flexibility next summer — and more re-signing cost.",
  },
  "fa.list": { ja: "契約一覧", en: "Contract list" },
  "fa.optionType": { ja: "状態", en: "Status" },
  "fa.playerOption": { ja: "プレイヤーオプション", en: "Player option" },
  "fa.teamOption": { ja: "チームオプション", en: "Team option" },
  "fa.eto": { ja: "早期終了オプション", en: "Early termination option" },
  "fa.nonGuaranteed": { ja: "非保証", en: "Non-guaranteed" },
  "fa.expiring": { ja: "満了", en: "Expiring" },
  "fa.biggest": { ja: "最大の満了契約", en: "Biggest expiring deals" },
  "fa.filterOption": { ja: "オプション種別", en: "Option type" },

  // ---- cap history -------------------------------------------------------
  "cap.title": { ja: "サラリーキャップの推移", en: "Salary cap history" },
  "cap.subtitle": {
    ja: "キャップ、タックスライン、両エプロンの公式発表額。{season} はリーグが正式に確定した値です。",
    en: "Officially announced cap, tax level and aprons. {season} figures are final.",
  },
  "cap.chart": { ja: "ラインの推移", en: "Thresholds over time" },
  "cap.growth": { ja: "前年比上昇率", en: "Year-over-year growth" },
  "cap.taxOverCap": { ja: "タックスライン／キャップ", en: "Tax level as % of cap" },
  "cap.smoothing": { ja: "キャップスムージング", en: "Cap smoothing" },
  "cap.smoothingBody": {
    ja: "2023年のCBAで、放送権収入が急増してもキャップの上昇は年10%までに抑えられることになりました。2025-26は上限いっぱいの+10.0%、2026-27はローカル放送権収入の減少を受けて+6.7%に留まっています。",
    en: "The 2023 CBA caps annual growth at 10% even as media revenue jumps. 2025-26 rose the full 10%; 2026-27 grew just 6.7% after local media revenue slipped.",
  },
  "cap.table": { ja: "シーズン別サマリー", en: "Season by season" },
  "cap.firstApron": { ja: "第1エプロン導入", en: "First apron introduced" },
  "cap.note2023": {
    ja: "2023-24からの新CBAで第1・第2エプロンが導入され、税率はMLE連動のブラケット刻みになりました。",
    en: "The 2023-24 CBA introduced both aprons and tax brackets sized to the taxpayer MLE.",
  },

  // ---- footer ------------------------------------------------------------
  "footer.about": { ja: "このサイトについて", en: "About this site" },
  "footer.methodology": {
    ja: "ロスターとキャップ計上額は nbasalaries.com の公開スナップショット（{date}）を、キャップ基準額はNBA公式発表値を使用しています。2025-26以前のペイロールは SalariesWish / Spotrac 系の集計値です。",
    en: "Rosters and cap charges come from the public nbasalaries.com snapshot ({date}); thresholds use the NBA's official figures. Pre-2026-27 payrolls follow SalariesWish / Spotrac-style aggregates.",
  },
  "footer.disclaimer": {
    ja: "タックス額はシーズン終了時の確定計算で変わる推計値です。インセンティブ、キャップホールド、シーズン中のトレードは含まれていません。",
    en: "Tax figures are estimates that change with the season-end assessment. Incentives, cap holds and in-season trades are not included.",
  },
  "footer.refresh": {
    ja: "データは同梱のスクリプトで更新できます：npm run scrape",
    en: "Refresh the data with the bundled scripts: npm run scrape",
  },
  "footer.units": { ja: "単位：米ドル（USD）", en: "All figures in USD" },
  "footer.built": { ja: "Next.js + Tailwind + 自作SVGチャート", en: "Next.js + Tailwind + hand-rolled SVG charts" },
  "news.live": { ja: "ライブ更新中", en: "Live" },
  "news.liveNote": {
    ja: "このビューはAPI経由で最新を取得中（失敗時は同梱スナップショット表示）。",
    en: "This view refreshes via the live API (falls back to the bundled snapshot).",
  },
  "shell.menu": { ja: "メニュー", en: "Menu" },
  "shell.contents": { ja: "コンテンツ", en: "Contents" },
  "nav.quiz": { ja: "クイズ", en: "Quiz" },
  "th.cpw": { ja: "1勝コスト", en: "$/win" },
  "dash.kicker": { ja: "ペイロール・インテリジェンス", en: "Payroll Intelligence" },
  "dash.cpw": { ja: "1勝あたりコストランキング", en: "Cost per win ranking" },
  "dash.cpwSub": {
    ja: "{prev}シーズンの勝利数で割ったペイロール。小さいほど「お金の使い方」が高効率（勝利数0のチームは除外）。",
    en: "Payroll divided by {prev} wins — lower means more efficient spending (teams with 0 wins excluded).",
  },
  "quiz.title": { ja: "NBA年俸クイズ", en: "NBA Salary Quiz" },
  "quiz.sub": {
    ja: "今のリアルデータから出す10問。友人とスコアを競おう（言語切替対応）。",
    en: "10 questions generated from live data. Beat your friends' score.",
  },
  "quiz.progress": { ja: "第{q}問 / {n}", en: "Q{q} / {n}" },
  "quiz.score": { ja: "スコア", en: "Score" },
  "quiz.next": { ja: "次の問題", en: "Next question" },
  "quiz.toResult": { ja: "結果を見る", en: "See result" },
  "quiz.answer": { ja: "正解", en: "Answer" },
  "quiz.replay": { ja: "もう一度挑戦", en: "Play again" },
  "quiz.share": { ja: "結果をコピー", en: "Copy result" },
  "quiz.copied": { ja: "コピーしました", en: "Copied!" },
  "quiz.shareText": { ja: "NBA年俸クイズ {s}/{n} 正解！", en: "I scored {s}/{n} on the NBA Salary Quiz!" },
  "quiz.msgGreat": { ja: "サラリーキャップマスター認定！", en: "Certified salary-cap master!" },
  "quiz.msgGood": { ja: "なかなかのマネーゲーム通！", en: "Solid money-game knowledge!" },
  "quiz.msgBad": { ja: "ダッシュボードで復習しよう！", en: "Time to review the dashboard!" },
  "quiz.q.topPayroll": { ja: "ペイロール（総年俸）が最も高いチームはどこ？", en: "Which team has the highest payroll?" },
  "quiz.q.teamRank": { ja: "{team} のペイロール順位は何位？", en: "What payroll rank is {team}?" },
  "quiz.q.rankTeam": { ja: "ペイロール順位 {n} 位のチームはどこ？", en: "Which team is payroll rank #{n}?" },
  "quiz.q.tax": { ja: "{team} のラグジュアリータックス推計額はいくら？", en: "How much is {team}'s estimated luxury tax?" },
  "quiz.q.topPlayer": { ja: "今季最も年俸が高い選手は？", en: "Who has the highest salary this season?" },
  "quiz.q.taxpayers": { ja: "タックスラインを超えるチームはいくつ？", en: "How many teams are over the tax line?" },
  "quiz.q.cpw": { ja: "1勝あたりコストが最も低い（高効率な）チームはどこ？", en: "Which team has the lowest cost per win?" },
  "quiz.q.expiring": { ja: "今季満了の年俸が最も多いチームはどこ？", en: "Which team has the most salary expiring this season?" },
  "quiz.q.dead": { ja: "デッドマネーが最も多いチームはどこ？", en: "Which team carries the most dead money?" },
  "quiz.q.apron2": { ja: "第2エプロンを超えているチームはどこ？", en: "Which team is above the second apron?" },
  "quiz.x.payroll": { ja: "{team} ／ ペイロール {value}", en: "{team} — payroll {value}" },
  "quiz.x.rank": { ja: "{team} は {n} 位", en: "{team} — rank #{n}" },
  "quiz.x.tax": { ja: "{team} ／ タックス推計 {value}", en: "{team} — est. tax {value}" },
  "quiz.x.player": { ja: "{player} ／ {value}", en: "{player} — {value}" },
  "quiz.x.taxpayers": { ja: "{n} チーム", en: "{n} teams" },
  "quiz.x.cpw": { ja: "{team} ／ 1勝 {value}", en: "{team} — {value} per win" },
  "quiz.x.expiring": { ja: "{team} ／ 満了 {value}", en: "{team} — {value} expiring" },
  "quiz.x.dead": { ja: "{team} ／ デッド {value}", en: "{team} — {value} dead" },
  "quiz.x.apron2": { ja: "{team} が該当", en: "{team}" },
} satisfies Record<string, Entry>;

export type DictKey = keyof typeof DICT;

type Params = Record<string, string | number>;

export function translate(key: DictKey, lang: Lang, params?: Params): string {
  let out: string = DICT[key]?.[lang] ?? String(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: DictKey, params?: Params) => string;
}

const Ctx = createContext<LangCtx | null>(null);

const STORAGE_KEY = "nba-salary-lang";

function detect(): Lang {
  if (typeof window === "undefined") return "ja";
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  if (stored === "ja" || stored === "en") return stored;
  // Default is Japanese everywhere so the server snapshot and the first client
  // paint always agree (no hydration flash); the header toggle persists a choice.
  return "ja";
}

/**
 * Tiny external store so the language survives a reload without a
 * render-then-correct effect (which would flash the wrong locale).
 * The server snapshot is always "ja"; the client snapshot reads localStorage
 * during hydration, so the two agree on first paint and React patches the
 * text once the real value is available.
 */
let cached: Lang | null = null;
const listeners = new Set<() => void>();

function read(): Lang {
  if (cached === null) cached = detect();
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Lang {
  return read();
}

function getServerSnapshot(): Lang {
  return "ja";
}

function write(next: Lang) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
  listeners.forEach((l) => l());
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((next: Lang) => write(next), []);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      toggle: () => write(lang === "ja" ? "en" : "ja"),
      t: (key, params) => translate(key, lang, params),
    }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}

/** Convenience for components that only need the language code. */
export function useL(): Lang {
  return useLang().lang;
}
