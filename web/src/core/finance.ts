import type { LiabilityKind, MoneyCent, PlayerState } from './types';

export const LIABILITY_LABELS: Record<LiabilityKind, string> = {
  personalLoan: '信用貸款',
  carLoan: '車貸',
  cardRevolving: '信用卡循環',
  studentLoan: '學貸',
  homeMortgage: '自住房貸',
  businessLoan: '事業貸款',
  investmentPropertyMortgage: '投資房貸',
};

export interface PlayerFinancialMetrics {
  salary: MoneyCent;
  passiveIncome: MoneyCent;
  totalIncome: MoneyCent;
  fixedExpenses: MoneyCent;
  debtPayments: MoneyCent;
  totalExpenses: MoneyCent;
  monthlyCashflow: MoneyCent;
  energyUsed: number;
  energyCap: number;
  totalAssetValue: MoneyCent;
  totalDebt: MoneyCent;
  netAssets: MoneyCent;
  freedomCompletion: number; // 0 ~ 100
  canEscapeRatRace: boolean;
}

export function formatNtd(cents: MoneyCent, withSign = false): string {
  const ntd = Math.round(cents / 100);
  const absFormatted = Math.abs(ntd).toLocaleString('zh-TW');
  if (ntd < 0) return `-NT$ ${absFormatted}`;
  if (withSign && ntd > 0) return `+NT$ ${absFormatted}`;
  return `NT$ ${absFormatted}`;
}

export function computeMonthlyMortgage(
  principal: MoneyCent,
  annualRateMillionth: number,
  months: number
): MoneyCent {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRateMillionth / 1_000_000 / 12;
  if (r <= 0) return Math.round(principal / months);
  const factor = Math.pow(1 + r, months);
  return Math.round((principal * (r * factor)) / (factor - 1));
}

export function computePlayerMetrics(player: PlayerState): PlayerFinancialMetrics {
  const p = player.profession;
  const salary = player.track === 'inner' ? p.monthlySalary : 0;
  const passiveIncome = player.assets.reduce((acc, a) => acc + a.monthlyNet, 0);
  const totalIncome = salary + passiveIncome;

  const fixedExpenses =
    player.track === 'inner'
      ? p.insurancePremium +
        p.incomeTax +
        p.housingCost +
        p.livingCost +
        player.children * p.childMonthlyCost
      : 0;

  const debtPayments = player.liabilities.reduce((acc, l) => acc + l.monthlyPayment, 0);
  const totalExpenses = fixedExpenses + debtPayments;
  const monthlyCashflow =
    player.track === 'inner' ? totalIncome - totalExpenses : player.fastTrackCashflowDay;

  const energyUsed = player.assets.reduce((acc, a) => acc + a.energy, 0);
  const energyCap = p.energyBaseline;

  const totalAssetValue = player.assets.reduce((acc, a) => acc + a.value, 0);
  const totalDebt = player.liabilities.reduce((acc, l) => acc + l.balance, 0);
  const netAssets = player.cash + totalAssetValue - totalDebt;

  let freedomCompletion = 0;
  if (player.track === 'inner') {
    freedomCompletion =
      totalExpenses > 0 ? Math.min(100, Math.max(0, (passiveIncome / totalExpenses) * 100)) : 100;
  } else {
    freedomCompletion =
      player.fastTrackTargetIncrease > 0
        ? Math.min(100, Math.max(0, (player.fastTrackGainedIncrease / player.fastTrackTargetIncrease) * 100))
        : 100;
  }

  const canEscapeRatRace =
    player.track === 'inner' && totalExpenses > 0 && passiveIncome >= totalExpenses;

  return {
    salary,
    passiveIncome,
    totalIncome,
    fixedExpenses,
    debtPayments,
    totalExpenses,
    monthlyCashflow,
    energyUsed,
    energyCap,
    totalAssetValue,
    totalDebt,
    netAssets,
    freedomCompletion,
    canEscapeRatRace,
  };
}

export interface AssetAllocationItem {
  key: 'cash' | 'stock' | 'realEstate' | 'business' | 'fixedIncome';
  label: string;
  amount: MoneyCent;
  percent: number;
  color: string;
}

export function computeAssetAllocation(player: PlayerState): {
  totalGrossAssets: MoneyCent;
  items: AssetAllocationItem[];
} {
  let stock = 0;
  let realEstate = 0;
  let business = 0;
  let fixedIncome = 0;

  for (const a of player.assets) {
    const val = Math.max(0, a.value);
    if (a.assetKind === 'stock') stock += val;
    else if (a.assetKind === 'realEstate' || a.assetKind === 'preSaleHouse') realEstate += val;
    else if (a.assetKind === 'business' || a.assetKind === 'activeSideBusiness') business += val;
    else fixedIncome += val;
  }

  const cash = Math.max(0, player.cash);
  const totalGrossAssets = cash + stock + realEstate + business + fixedIncome;
  const pct = (v: MoneyCent) => (totalGrossAssets > 0 ? (v / totalGrossAssets) * 100 : 0);

  return {
    totalGrossAssets,
    items: [
      { key: 'cash', label: '手上現金', amount: cash, percent: pct(cash), color: '#245E50' },
      { key: 'stock', label: '台股／ETF', amount: stock, percent: pct(stock), color: '#2E8B99' },
      { key: 'realEstate', label: '不動產', amount: realEstate, percent: pct(realEstate), color: '#E8A849' },
      { key: 'business', label: '事業／副業', amount: business, percent: pct(business), color: '#C85A32' },
      { key: 'fixedIncome', label: '定存／債券／保險', amount: fixedIncome, percent: pct(fixedIncome), color: '#6B549B' },
    ],
  };
}

