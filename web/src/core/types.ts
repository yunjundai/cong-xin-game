export type MoneyCent = number; // 100 = NT$1

export type LiabilityKind =
  | 'personalLoan'
  | 'carLoan'
  | 'cardRevolving'
  | 'studentLoan'
  | 'homeMortgage'
  | 'businessLoan'
  | 'investmentPropertyMortgage';

export interface Liability {
  id: string;
  kind: LiabilityKind;
  label?: string;
  balance: MoneyCent;
  monthlyPayment: MoneyCent;
  annualInterestRate: number; // 分母 1_000_000 (例如 23000 = 2.3%)
}

export interface ProfessionDef {
  id: string;
  name: string;
  monthlySalary: MoneyCent;
  insurancePremium: MoneyCent;
  incomeTax: MoneyCent;
  housingCost: MoneyCent;
  livingCost: MoneyCent;
  startingChildren: number;
  startingCash: MoneyCent;
  startingLiabilities: Liability[];
  energyBaseline: number;
  childMonthlyCost: MoneyCent;
}

export interface StockDef {
  tickerSymbol: string;
  companyName: string;
  priceRange: [MoneyCent, MoneyCent];
  startPrice: MoneyCent;
  dividendPerShare: MoneyCent;
  trendPerPayday: number;
  volatilityPerPayday: number;
  tradeUnit: number;
}

export interface SmallDealDef {
  id: string;
  kind: 'smallDeal';
  assetKind: 'business' | 'activeSideBusiness' | 'stock' | 'tontine' | 'timeDeposit' | 'endowmentInsurance';
  title: string;
  cost: MoneyCent;
  monthlyCashflow: MoneyCent;
  energyCost: number;
  loanPrincipal: MoneyCent;
  loanMonthlyPayment: MoneyCent;
  loanAnnualRate: number;
  tickerSymbol?: string;
  businessCategory?: string;
  resaleValue?: MoneyCent;
  buyoutMultiplier?: number;
  survivalCheck?: {
    months: number;
    failFaces: number;
    failMode: string;
    salvage?: MoneyCent;
  };
  installmentConversion?: {
    kind: string;
    months: number;
    payoutAmount: MoneyCent;
  };
}

export interface BigDealDef {
  id: string;
  kind: 'bigDeal';
  assetKind: 'realEstate' | 'preSaleHouse' | 'business';
  title: string;
  price: MoneyCent;
  downPayment: MoneyCent;
  loanPrincipal: MoneyCent;
  loanAnnualRate: number;
  loanMonths: number;
  monthlyGrossIncome: MoneyCent;
  energyCost: number;
  region?: string;
  buildingType?: string;
  businessCategory?: string;
  appreciation?: string;
}

export interface DoodadDef {
  id: string;
  kind: 'doodad';
  title: string;
  amount: MoneyCent;
}

export interface MarketDef {
  id: string;
  kind:
    | 'realEstateSaleOffer'
    | 'shippingStockRally'
    | 'rateCutStockRally'
    | 'stockCrashDipBuy'
    | 'sideBusinessMaturation'
    | 'sideBusinessBuyoutOffer'
    | 'subdividedRentalFine'
    | 'universalCashGrant'
    | 'businessPermanentCashflowCut';
  title: string;
  eligibleRegions?: string[];
  eligibleBuildingTypes?: string[];
  affectedCategories?: string[];
  saleMultiplier?: number; // 分母 10000
  tickerSymbol?: string;
  companyName?: string;
  specialDividendPerThousandShares?: MoneyCent;
  amountPerSeat?: MoneyCent;
  fineAmount?: MoneyCent;
  cut?: number;
}

export interface DreamDef {
  id: string;
  title: string;
  cost: MoneyCent;
}

export interface FastInvestmentDef {
  id: string;
  title: string;
  cost: MoneyCent;
  cashflowDayIncomeIncrease: MoneyCent;
}

export type InnerTileType =
  | 'opportunity'
  | 'payday'
  | 'doodad'
  | 'market'
  | 'charity'
  | 'baby'
  | 'unpaidLeave';

export type OuterTileType = 'investment' | 'cashflowDay' | 'dream' | 'risk';

export interface GameContent {
  version: string;
  currency_unit: string;
  professions: ProfessionDef[];
  stocks: StockDef[];
  small: SmallDealDef[];
  big: BigDealDef[];
  doodad: DoodadDef[];
  market: MarketDef[];
  dreams: DreamDef[];
  investments: FastInvestmentDef[];
  board: InnerTileType[];
  fast_board: OuterTileType[];
}

export interface PlayerAsset {
  uid: string;
  sourceId: string;
  title: string;
  assetKind: string;
  cost: MoneyCent;
  value: MoneyCent;
  monthlyNet: MoneyCent;
  energy: number;
  shares?: number;
  tickerSymbol?: string;
  region?: string;
  buildingType?: string;
  businessCategory?: string;
  linkedLiabilityId?: string;
}

export interface PlayerState {
  id: string;
  nickname: string;
  isHuman: boolean;
  gender: 'M' | 'F';
  profession: ProfessionDef;
  dreamId: string;
  track: 'inner' | 'outer';
  position: number;
  cash: MoneyCent;
  children: number;
  age: number;
  charityTurns: number;
  skipTurns: number;
  assets: PlayerAsset[];
  liabilities: Liability[];
  fastTrackCashflowDay: MoneyCent;
  fastTrackTargetIncrease: MoneyCent;
  fastTrackGainedIncrease: MoneyCent;
  won: boolean;
  out: boolean;
}

export type PendingPrompt =
  | { type: 'opportunityChoice' }
  | { type: 'smallDeal'; card: SmallDealDef; stockPrice?: MoneyCent }
  | { type: 'bigDeal'; card: BigDealDef }
  | { type: 'doodad'; card: DoodadDef }
  | { type: 'market'; card: MarketDef }
  | { type: 'charity'; amount: MoneyCent }
  | { type: 'baby'; childMonthlyCost: MoneyCent }
  | { type: 'unpaidLeave' }
  | { type: 'fastInvestment'; card: FastInvestmentDef }
  | { type: 'fastDream'; dream: DreamDef; isOwnDream: boolean }
  | { type: 'fastRisk'; title: string; lossAmount: MoneyCent };

export interface GameLogEntry {
  id: string;
  turn: number;
  playerName: string;
  message: string;
  tone: 'neutral' | 'positive' | 'negative' | 'milestone';
}

export interface GameState {
  matchId: string;
  mode: 'standard' | 'quick';
  turn: number;
  currentPlayerIndex: number;
  phase: 'rolling' | 'prompt' | 'ended';
  lastDice: number[];
  stockPrices: Record<string, MoneyCent>;
  players: PlayerState[];
  prompt: PendingPrompt | null;
  logs: GameLogEntry[];
  winnerId: string | null;
}
