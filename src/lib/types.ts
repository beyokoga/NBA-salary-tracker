/** Shared shapes for the salary data produced by scripts/build_data.py */

export type Lang = "ja" | "en";

export interface SeasonLines {
  cap: number;
  tax: number;
  apron1: number;
  apron2: number;
  floor: number;
  mleNonTax: number;
  mleTax: number;
  roomMle: number;
  bae: number;
  twoWay: number;
  earlyBird: number;
  estAvgSalary: number;
  max0_6: number;
  max7_9: number;
  max10: number;
  tradeCashLimit: number;
  exhibit10Max: number;
  expandedTpe: number;
}

export interface CapHistoryEntry {
  cap: number;
  tax: number;
  apron1: number | null;
  apron2: number | null;
  floor: number | null;
  mleNonTax?: number;
  mleTax?: number;
}

export type ApronLevel = "second" | "first" | "tax" | "belowTax";
export type PlayoffResult =
  | "champion"
  | "finals"
  | "confFinals"
  | "confSemis"
  | "firstRound"
  | "missed";

export interface TeamRecord {
  abbr: string;
  conference: string;
  wins: number;
  losses: number;
  winPct: number;
  confRank: number;
  confSeed: number | null;
  playoffSeed: number | null;
  gamesBehind: string | null;
  ppg: number;
  opppg: number;
  diff: number;
  streak: string | null;
  madePlayoffs: boolean;
  playIn: boolean;
  result: PlayoffResult;
}

export interface TeamSummary {
  slug: string;
  name: string;
  abbr: string;
  city: string;
  nickname: string;
  conference: "Eastern" | "Western";
  division: string;
  color: string;
  logo: string;
  payroll: number;
  payrollActive: number;
  payrollCash: number | null;
  deadCap: number;
  capHolds: number;
  rosterCount: number;
  rank: number;
  capShare: number;
  top3Share: number;
  payrollDelta: number | null;
  prevPayroll: number | null;
  taxSalary: number;
  apronSalary: number;
  overCap: number;
  capSpace: number;
  overTax: number;
  apronLevel: ApronLevel;
  repeater: boolean;
  taxpayerPrev4: number;
  taxEstimate: number;
  taxAllIn: number;
  siteTax: number;
  topPlayer: string;
  topSalary: number;
  expiringCount: number;
  expiringSalary: number;
  scheduled: Record<string, number>;
  history: { season: string; payroll: number }[];
  wins: number | null;
  losses: number | null;
  winPct: number | null;
  confSeed: number | null;
  playoffResult: PlayoffResult | null;
}

export interface PlayerContract {
  id: string;
  name: string;
  pos: string | null;
  position: string | null;
  age: number | null;
  height: string | null;
  country: string | null;
  salary: number | null;
  salaryPrev: number | null;
  salaryDelta: number | null;
  capHit: number | null;
  capShare: number | null;
  teamShare: number | null;
  contractValue: number | null;
  guaranteed: number | null;
  contractType: string | null;
  contractThrough: string | null;
  option: string | null;
  optionKind: OptionKind;
  freeAgency: number | null;
  careerEarnings: number | null;
  netWorth: number | null;
}

export type OptionKind =
  | "expiring"
  | "playerOption"
  | "teamOption"
  | "mutual"
  | "eto"
  | "nonGuaranteed";

export interface RosterPlayer extends PlayerContract {
  team: string;
  teamName: string;
  teamSlug: string;
  teamColor: string;
}

export interface TaxRow {
  bracket: number;
  from: number;
  to: number;
  rate: number;
  amount: number;
}

export interface TaxBreakdown {
  overage: number;
  repeater: boolean;
  bracketTax: number;
  apron1Surcharge: number;
  apron2Surcharge: number;
  total: number;
  rows: TaxRow[];
  effectiveRate: number;
  effectiveRateAllIn: number;
}

export interface ExpiringPlayer {
  name: string;
  salary: number | null;
  option: OptionKind;
  age: number | null;
  pos: string | null;
}

export interface PendingOption {
  name: string;
  season: string;
  kind: OptionKind;
  salary: number | null;
  age: number | null;
}

export interface FutureCell {
  amount: number | null;
  option: "PO" | "TO" | null;
}

export interface FutureRow {
  label: string;
  player: string;
  pos: string | null;
  total: boolean;
  cells: FutureCell[];
}

export interface TeamPayrollHistory {
  season: string;
  payroll: number;
  cap: number;
  tax: number;
  cash: number | null;
  basis?: string;
  source?: string;
}

export interface TaxHistoryEntry {
  season: string;
  status: string;
}

export interface TeamDetail {
  slug: string;
  name: string;
  abbr: string;
  city: string;
  nickname: string;
  conference: "Eastern" | "Western";
  division: string;
  color: string;
  logo: string;
  teamId: number | null;
  season: string;
  snapshotDate: string | null;
  payroll: number;
  payrollActive: number;
  payrollCash: number | null;
  deadCap: number;
  capHolds: number;
  rosterTotal: number;
  rosterCount: number;
  capShare: number;
  top3Share: number;
  rank: number;
  payrollDelta: number | null;
  prevSeason: string | null;
  prevPayroll: number | null;
  history: TeamPayrollHistory[];
  taxSalary: number;
  apronSalary: number;
  repeater: boolean;
  taxpayerPrev4: number;
  taxHistory: TaxHistoryEntry[];
  siteTax: number;
  tax: TaxBreakdown;
  overCap: number;
  capSpace: number;
  overTax: number;
  roomToTax: number;
  roomToApron1: number;
  roomToApron2: number;
  apronLevel: ApronLevel;
  roster: PlayerContract[];
  futureYears: string[];
  futureRows: FutureRow[];
  scheduled: Record<string, number>;
  scheduledGuaranteed: Record<string, number>;
  expiring: ExpiringPlayer[];
  pendingOptions: PendingOption[];
  expiringSalary: number;
  contractNote: string | null;
  eraNote: string | null;
  record: TeamRecord | Record<string, never>;
}

export interface PlayoffSeries {
  conf: "East" | "West";
  winner: string;
  winnerSeed: number;
  loser: string;
  loserSeed: number;
  result: string;
}

export interface Playoffs {
  season: string;
  champion: string;
  runnerUp: string;
  finalsMvp: { name: string; team: string };
  finals: {
    series: string;
    games: { n: number; away: string; awayScore: number; home: string; homeScore: number }[];
  };
  rounds: { name: string; series: PlayoffSeries[] }[];
  resultByTeam: Record<string, PlayoffResult>;
  note: string;
}

export interface NewsItem {
  date: string;
  abbr: string;
  slug: string | null;
  teamName: string;
  category: "trade" | "signing" | "twoWay" | "waiver" | "claim" | "other";
  text: string;
}

export interface NewsHeadline {
  title: string;
  desc: string;
  url: string;
  published: string;
}

export interface NewsDoc {
  fetchedAt: string;
  cutoffDays: number;
  items: NewsItem[];
  headlines: NewsHeadline[];
}

export interface Award {
  key: string;
  player: string;
  team: string;
  coach?: boolean;
  exec?: boolean;
}

export interface LeagueDoc {
  season: string;
  prevSeason: string;
  generatedAt: string;
  rosterSnapshot: string | null;
  source: string;
  lines: SeasonLines;
  capHistory: Record<string, CapHistoryEntry>;
  teams: TeamSummary[];
  standings: Record<string, StandingRow[]>;
  playoffs: Playoffs;
  awards: { season: string; list: Award[] };
  futureRankings: Record<
    string,
    { teamTotal: number; rank: number; teams: { name: string; slug: string; payroll: number; current: boolean }[] }
  >;
  totals: {
    payroll: number;
    cash: number;
    tax: number;
    taxAllIn: number;
    players: number;
    taxpayers: number;
    apron1: number;
    apron2: number;
    underCap: number;
    avgPayroll: number;
    avgSalary: number;
    medianSalary: number;
  };
}

export interface StandingRow {
  abbr: string;
  wins: number;
  losses: number;
  winPct: number;
  seed: number | null;
  gb: string | null;
  diff: number;
  ppg: number;
  opppg: number;
  result: PlayoffResult;
  madePlayoffs: boolean;
}

export interface FreeAgencyRow {
  team: string;
  teamName: string;
  teamSlug: string;
  teamColor: string;
  name: string;
  playerId: string;
  pos: string | null;
  age: number | null;
  salary: number | null;
  capHit: number | null;
  teamShare: number | null;
  contractType: string | null;
  contractValue: number | null;
  guaranteed: number | null;
  careerEarnings: number | null;
  through: string;
  option: OptionKind;
  optionText: string | null;
  optionSeason?: string;
  freeAgency: number | null;
}

export interface FreeAgencyTeam {
  team: string;
  teamName: string;
  teamSlug: string;
  teamColor: string;
  count: number;
  total: number;
  guaranteedOut: number;
  playerOptions: number;
}

export interface FreeAgencyDoc {
  season: string;
  nextSummer: number;
  expiring: FreeAgencyRow[];
  options: FreeAgencyRow[];
  byTeam: FreeAgencyTeam[];
  totals: {
    count: number;
    salary: number;
    guaranteedOut: number;
    teams: number;
    playerOptions: number;
    teamOptions: number;
    nonGuaranteed: number;
    optionCount: number;
    optionSalary: number;
  };
}
