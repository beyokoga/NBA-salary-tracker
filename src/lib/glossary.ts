import type { Lang } from "./types";

export type GlossaryId =
  | "cap"
  | "luxtax"
  | "apron1"
  | "apron2"
  | "repeater"
  | "deadcap"
  | "caphold"
  | "mle"
  | "bird"
  | "twoway"
  | "po"
  | "to"
  | "nonguar"
  | "floor";

type Entry = Record<Lang, { term: string; text: string }>;

export const GLOSSARY: Record<GlossaryId, Entry> = {
  cap: {
    ja: { term: "サラリーキャップ", text: "CBA（労使協定）で決まるチーム別年俸の基準上限。2026-27は$164.961M。超過自体は各種例外で認められる。" },
    en: { term: "Salary cap", text: "The CBA's baseline limit on team player salaries — $164.961M for 2026-27. Going over is allowed via exceptions." },
  },
  luxtax: {
    ja: { term: "ラグジュアリータックス", text: "タックスライン（2026-27は$200.428M）を超えた超過額にかかる累進税。税額は非課税チームへ分配される。" },
    en: { term: "Luxury tax", text: "A progressive tax on payroll above the tax line ($200.428M in 2026-27). Proceeds are distributed to non-taxpaying teams." },
  },
  apron1: {
    ja: { term: "第1エプロン", text: "タックスラインの上の警戒ライン（$209.015M）。超えるとサイン&トレード制限やtax bracketの加算が始まる。" },
    en: { term: "First apron", text: "A trigger line above tax ($209.015M). Crossing it brings sign-and-trade limits and tax surcharges." },
  },
  apron2: {
    ja: { term: "第2エプロン", text: "最厳しい規制ライン（$221.686M）。MLE喪失・高額サーチャージ・トレード制限などペナルティが最大になる。" },
    en: { term: "Second apron", text: "The harshest line ($221.686M): loss of MLE, big surcharges and the strictest trade restrictions." },
  },
  repeater: {
    ja: { term: "リピーター", text: "直近4シーズン中3シーズン課税されたチーム。通常より高い税率（$3.00〜/超過$1）が適用される。" },
    en: { term: "Repeater", text: "A team taxed in 3 of the last 4 seasons. Pays higher rates ($3.00+ per $1 of overage)." },
  },
  deadcap: {
    ja: { term: "デッドキャップ", text: "ウェーブやトレードでいなくなった選手にまだ発生しているキャップ計上額。ロスターにいないが帳簿に残る。" },
    en: { term: "Dead cap", text: "Cap charges for players no longer on the roster (waived/traded) that still count against the cap." },
  },
  caphold: {
    ja: { term: "キャップホールド", text: "FA権利などを保有するために一時的に計上される見込み額。契約すると実額に置き換わる。" },
    en: { term: "Cap hold", text: "A placeholder charge for retained rights (e.g. own free agents); replaced by the real salary once signed." },
  },
  mle: {
    ja: { term: "MLE（ミッドレベル例外）", text: "キャップ超過チームでも選手獲得を認める例外制度。2026-27の非課税MLEは$15.044M。tax bracketの幅にもなる。" },
    en: { term: "MLE (mid-level exception)", text: "An exception letting over-cap teams sign players — $15.044M (non-taxpayer) in 2026-27; also sets tax bracket width." },
  },
  bird: {
    ja: { term: "バード権", text: "在籍期間などの条件で自チームFAとキャップ超過でも再契約できる権利。最大年俸・最長年数で契約可能に。" },
    en: { term: "Bird rights", text: "Rights letting a team re-sign its own free agent over the cap, at max salary and longest term." },
  },
  twoway: {
    ja: { term: "ツーウェイ契約", text: "NBAとGリーグ両方に行き来できる契約。2026-27の基準額は$678,882でキャップ計上は小さい。" },
    en: { term: "Two-way contract", text: "A roster slot moving between NBA and G League; base salary $678,882 in 2026-27 with a small cap charge." },
  },
  po: {
    ja: { term: "プレイヤーオプション", text: "契約最終年などを選手側が続行/破棄を選べる年。破棄すればFAになれる。" },
    en: { term: "Player option", text: "A season the player can opt out of to reach free agency." },
  },
  to: {
    ja: { term: "チームオプション", text: "チーム側が継続/放棄を選べる年。若手契約の3〜4年目に多い。" },
    en: { term: "Team option", text: "A season the team can keep or decline — common in years 3-4 of rookie contracts." },
  },
  nonguar: {
    ja: { term: "ノンギャランティー", text: "年俸の保証がない部分。期日前に解雇すればチームはコストを節約できる。" },
    en: { term: "Non-guaranteed", text: "Unguaranteed salary: the team can waive before deadline dates and save money." },
  },
  floor: {
    ja: { term: "サラリーフロア", text: "チームに義務づけられる最低ペイロール（2026-27は$148.465M）。未達は差額を選手側へ分配。" },
    en: { term: "Salary floor", text: "The minimum payroll teams must spend ($148.465M in 2026-27); shortfalls are shared with players." },
  },
};
