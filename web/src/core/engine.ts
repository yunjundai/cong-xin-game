import contentRaw from '../data/content.json';
import { computeMonthlyMortgage, computePlayerMetrics, formatNtd } from './finance';
import type {
  BigDealDef,
  GameContent,
  GameLogEntry,
  GameState,
  Liability,
  MarketDef,
  MoneyCent,
  PlayerAsset,
  PlayerState,
  SmallDealDef,
} from './types';

export const GAME_CONTENT = contentRaw as unknown as GameContent;

const PERSONAL_LOAN_UNIT: MoneyCent = 10_000_000; // NT$ 100,000
const PERSONAL_LOAN_MONTHLY: MoneyCent = 1_000_000; // NT$ 10,000 / 月 (10% 月付基準)
const FAST_TRACK_TARGET_INCREASE: MoneyCent = 50_000_000; // 外圈現金流日目標增加 NT$ 500,000

const AI_NAMES = ['林阿明', '陳小芸', '張志豪'];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export interface CreateMatchOptions {
  playerName: string;
  professionId: string;
  dreamId: string;
  gender: 'M' | 'F';
  mode: 'standard' | 'quick';
  aiCount?: number;
  rng?: () => number;
}

export function createInitialGameState(opts: CreateMatchOptions): GameState {
  const prof =
    GAME_CONTENT.professions.find((p) => p.id === opts.professionId) ?? GAME_CONTENT.professions[0];
  const dream = GAME_CONTENT.dreams.find((d) => d.id === opts.dreamId) ?? GAME_CONTENT.dreams[0];

  const stockPrices: Record<string, MoneyCent> = {};
  for (const s of GAME_CONTENT.stocks) {
    stockPrices[s.tickerSymbol] = s.startPrice;
  }

  const makePlayer = (
    nickname: string,
    isHuman: boolean,
    gender: 'M' | 'F',
    profession: typeof prof,
    dreamId: string
  ): PlayerState => ({
    id: uid(isHuman ? 'human' : 'ai'),
    nickname,
    isHuman,
    gender,
    profession,
    dreamId,
    track: 'inner',
    position: 0,
    cash: opts.mode === 'quick' ? profession.startingCash + profession.monthlySalary * 2 : profession.startingCash,
    children: profession.startingChildren,
    age: 26,
    charityTurns: 0,
    skipTurns: 0,
    assets: [],
    liabilities: profession.startingLiabilities.map((l) => ({ ...l })),
    fastTrackCashflowDay: 0,
    fastTrackTargetIncrease: FAST_TRACK_TARGET_INCREASE,
    fastTrackGainedIncrease: 0,
    won: false,
    out: false,
  });

  const players: PlayerState[] = [
    makePlayer(opts.playerName.trim() || '玩家', true, opts.gender, prof, dream.id),
  ];

  const aiCount = Math.min(3, Math.max(0, opts.aiCount ?? 3));
  const otherProfs = GAME_CONTENT.professions.filter((p) => p.id !== prof.id);
  for (let i = 0; i < aiCount; i++) {
    const aiProf = otherProfs[(i * 3) % otherProfs.length] ?? prof;
    const aiDream = GAME_CONTENT.dreams[(i + 1) % GAME_CONTENT.dreams.length];
    players.push(
      makePlayer(AI_NAMES[i] ?? `電腦 ${i + 1}`, false, i % 2 === 0 ? 'M' : 'F', aiProf, aiDream.id)
    );
  }

  return {
    matchId: uid('match'),
    mode: opts.mode,
    turn: 1,
    currentPlayerIndex: 0,
    phase: 'rolling',
    lastDice: [],
    stockPrices,
    players,
    prompt: null,
    logs: [
      {
        id: uid('log'),
        turn: 1,
        playerName: players[0].nickname,
        message: `選擇職業「${prof.name}」，目標夢想「${dream.title}」，從薪開始！`,
        tone: 'milestone',
      },
    ],
    winnerId: null,
  };
}

function appendLog(
  state: GameState,
  playerName: string,
  message: string,
  tone: GameLogEntry['tone'] = 'neutral'
): GameLogEntry[] {
  const entry: GameLogEntry = { id: uid('log'), turn: state.turn, playerName, message, tone };
  return [entry, ...state.logs].slice(0, 60);
}

function updateStockPricesOnPayday(
  prices: Record<string, MoneyCent>,
  rng: () => number
): Record<string, MoneyCent> {
  const next = { ...prices };
  for (const s of GAME_CONTENT.stocks) {
    const curr = next[s.tickerSymbol] ?? s.startPrice;
    const drift = s.trendPerPayday + Math.round((rng() * 2 - 1) * s.volatilityPerPayday);
    const clamped = Math.max(s.priceRange[0], Math.min(s.priceRange[1], curr + drift));
    next[s.tickerSymbol] = Math.round(clamped / 100) * 100;
  }
  return next;
}

function checkEscapeAndPromote(player: PlayerState, state: GameState): {
  player: PlayerState;
  logs: GameLogEntry[];
} {
  const metrics = computePlayerMetrics(player);
  if (!metrics.canEscapeRatRace) {
    return { player, logs: state.logs };
  }
  const fastTrackCashflowDay = Math.max(10_000_000, metrics.passiveIncome * 10);
  const promoted: PlayerState = {
    ...player,
    track: 'outer',
    position: 0,
    fastTrackCashflowDay,
    cash: player.cash + fastTrackCashflowDay,
  };
  const logs = appendLog(
    state,
    player.nickname,
    `被動收入超越總支出！成功逃離小鎮日常圈，晉升「東岸夢想圈」，獲得首筆現金流日 ${formatNtd(fastTrackCashflowDay)}！`,
    'milestone'
  );
  return { player: promoted, logs };
}

export function advanceTurn(state: GameState): GameState {
  if (state.phase === 'ended') return state;
  const nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
  const nextTurn = nextIdx === 0 ? state.turn + 1 : state.turn;
  return {
    ...state,
    currentPlayerIndex: nextIdx,
    turn: nextTurn,
    phase: 'rolling',
    prompt: null,
  };
}

export function rollDiceAndMove(
  state: GameState,
  diceCount: 1 | 2 = 1,
  rng: () => number = Math.random
): GameState {
  if (state.phase !== 'rolling') return state;
  const player = state.players[state.currentPlayerIndex];

  if (player.skipTurns > 0) {
    const updatedPlayer: PlayerState = { ...player, skipTurns: player.skipTurns - 1 };
    const players = state.players.map((p, i) => (i === state.currentPlayerIndex ? updatedPlayer : p));
    const logs = appendLog(state, player.nickname, '本回合處於無薪假／休息狀態，跳過移動。', 'negative');
    return advanceTurn({ ...state, players, logs, lastDice: [] });
  }

  const effectiveDiceCount =
    player.track === 'outer' ? 2 : player.charityTurns > 0 ? diceCount : 1;
  const dice: number[] = [];
  for (let i = 0; i < effectiveDiceCount; i++) {
    dice.push(Math.floor(rng() * 6) + 1);
  }
  const steps = dice.reduce((a, b) => a + b, 0);

  const board = player.track === 'inner' ? GAME_CONTENT.board : GAME_CONTENT.fast_board;
  const oldPos = player.position;
  const newPos = (oldPos + steps) % board.length;

  let nextPlayer: PlayerState = {
    ...player,
    position: newPos,
    charityTurns: Math.max(0, player.charityTurns - 1),
  };
  let nextStockPrices = state.stockPrices;
  let logs = appendLog(
    state,
    player.nickname,
    `擲出 ${dice.join(' + ')} = ${steps} 點，前進至第 ${newPos + 1} 格。`
  );

  // 檢查經過發薪日 / 現金流日
  let passedPaydays = 0;
  for (let s = 1; s <= steps; s++) {
    const idx = (oldPos + s) % board.length;
    if (player.track === 'inner' && GAME_CONTENT.board[idx] === 'payday') {
      passedPaydays++;
    } else if (player.track === 'outer' && GAME_CONTENT.fast_board[idx] === 'cashflowDay') {
      passedPaydays++;
    }
  }

  if (passedPaydays > 0) {
    const metrics = computePlayerMetrics(nextPlayer);
    const totalDelta = metrics.monthlyCashflow * passedPaydays;
    nextPlayer = {
      ...nextPlayer,
      cash: nextPlayer.cash + totalDelta,
      age: nextPlayer.age + (player.track === 'inner' ? 1 : 0),
    };
    nextStockPrices = updateStockPricesOnPayday(nextStockPrices, rng);
    logs = appendLog(
      { ...state, logs },
      player.nickname,
      player.track === 'inner'
        ? `經過發薪日（×${passedPaydays}），現金流結算 ${formatNtd(totalDelta, true)}。`
        : `經過東岸現金流日（×${passedPaydays}），入帳 ${formatNtd(totalDelta, true)}！`,
      totalDelta >= 0 ? 'positive' : 'negative'
    );
  }

  const players = state.players.map((p, i) => {
    const target = i === state.currentPlayerIndex ? nextPlayer : p;
    if (passedPaydays <= 0) return target;
    // 同步依最新台股報價更新所有玩家的股票現值
    return {
      ...target,
      assets: target.assets.map((a) =>
        a.assetKind === 'stock' && a.tickerSymbol && a.shares
          ? { ...a, value: (nextStockPrices[a.tickerSymbol] ?? 0) * a.shares }
          : a
      ),
    };
  });
  const movedState: GameState = {
    ...state,
    players,
    lastDice: dice,
    stockPrices: nextStockPrices,
    logs,
  };

  // 根據停留格子決定事件 Prompt
  if (nextPlayer.track === 'inner') {
    const tile = GAME_CONTENT.board[newPos];
    if (tile === 'payday') {
      return advanceTurn(movedState);
    }
    if (tile === 'opportunity') {
      return { ...movedState, phase: 'prompt', prompt: { type: 'opportunityChoice' } };
    }
    if (tile === 'doodad') {
      const card = pickRandom(GAME_CONTENT.doodad, rng);
      return { ...movedState, phase: 'prompt', prompt: { type: 'doodad', card } };
    }
    if (tile === 'market') {
      const card = pickRandom(GAME_CONTENT.market, rng);
      return { ...movedState, phase: 'prompt', prompt: { type: 'market', card } };
    }
    if (tile === 'charity') {
      const metrics = computePlayerMetrics(nextPlayer);
      const amount = Math.round(metrics.totalIncome * 0.1);
      return { ...movedState, phase: 'prompt', prompt: { type: 'charity', amount } };
    }
    if (tile === 'baby') {
      return {
        ...movedState,
        phase: 'prompt',
        prompt: { type: 'baby', childMonthlyCost: nextPlayer.profession.childMonthlyCost },
      };
    }
    if (tile === 'unpaidLeave') {
      return { ...movedState, phase: 'prompt', prompt: { type: 'unpaidLeave' } };
    }
  } else {
    const tile = GAME_CONTENT.fast_board[newPos];
    if (tile === 'cashflowDay') {
      return advanceTurn(movedState);
    }
    if (tile === 'investment') {
      const card = pickRandom(GAME_CONTENT.investments, rng);
      return { ...movedState, phase: 'prompt', prompt: { type: 'fastInvestment', card } };
    }
    if (tile === 'dream') {
      const dream = GAME_CONTENT.dreams[newPos % GAME_CONTENT.dreams.length];
      return {
        ...movedState,
        phase: 'prompt',
        prompt: { type: 'fastDream', dream, isOwnDream: dream.id === nextPlayer.dreamId },
      };
    }
    if (tile === 'risk') {
      const lossAmount = Math.round(nextPlayer.cash * 0.25);
      return {
        ...movedState,
        phase: 'prompt',
        prompt: { type: 'fastRisk', title: '市場突發風險／合夥稅務稽核', lossAmount },
      };
    }
  }

  return advanceTurn(movedState);
}

export function chooseOpportunitySize(
  state: GameState,
  size: 'small' | 'big',
  rng: () => number = Math.random
): GameState {
  if (state.prompt?.type !== 'opportunityChoice') return state;
  if (size === 'small') {
    const card = pickRandom(GAME_CONTENT.small, rng);
    const stockPrice = card.tickerSymbol ? state.stockPrices[card.tickerSymbol] : undefined;
    return { ...state, prompt: { type: 'smallDeal', card, stockPrice } };
  }
  const card = pickRandom(GAME_CONTENT.big, rng);
  return { ...state, prompt: { type: 'bigDeal', card } };
}

export function takePersonalLoan(state: GameState, units = 1): GameState {
  const player = state.players[state.currentPlayerIndex];
  const principal = PERSONAL_LOAN_UNIT * units;
  const monthlyPayment = PERSONAL_LOAN_MONTHLY * units;
  const newLoan: Liability = {
    id: uid('loan'),
    kind: 'personalLoan',
    label: '銀行信用貸款',
    balance: principal,
    monthlyPayment,
    annualInterestRate: 120000,
  };
  const updated: PlayerState = {
    ...player,
    cash: player.cash + principal,
    liabilities: [...player.liabilities, newLoan],
  };
  const players = state.players.map((p, i) => (i === state.currentPlayerIndex ? updated : p));
  const logs = appendLog(
    state,
    player.nickname,
    `申請信用貸款 ${formatNtd(principal)}（月付 +${formatNtd(monthlyPayment)}）。`,
    'negative'
  );
  return { ...state, players, logs };
}

export function repayLiability(state: GameState, liabilityId: string): GameState {
  const player = state.players[state.currentPlayerIndex];
  const target = player.liabilities.find((l) => l.id === liabilityId);
  if (!target || player.cash < target.balance) return state;

  let updated: PlayerState = {
    ...player,
    cash: player.cash - target.balance,
    liabilities: player.liabilities.filter((l) => l.id !== liabilityId),
  };
  let logs = appendLog(
    state,
    player.nickname,
    `清償負債 ${formatNtd(target.balance)}，月支出減少 ${formatNtd(target.monthlyPayment)}。`,
    'positive'
  );

  const check = checkEscapeAndPromote(updated, { ...state, logs });
  updated = check.player;
  logs = check.logs;

  const players = state.players.map((p, i) => (i === state.currentPlayerIndex ? updated : p));
  return { ...state, players, logs };
}

export function buyStock(state: GameState, tickerSymbol: string, lots = 1): GameState {
  if (lots <= 0) return state;
  const stockDef = GAME_CONTENT.stocks.find((s) => s.tickerSymbol === tickerSymbol);
  if (!stockDef) return state;

  const player = state.players[state.currentPlayerIndex];
  const pricePerShare = state.stockPrices[tickerSymbol] ?? stockDef.startPrice;
  const sharesToBuy = stockDef.tradeUnit * lots;
  const totalCost = pricePerShare * sharesToBuy;

  if (player.cash < totalCost) return state;

  const monthlyDivDelta = stockDef.dividendPerShare * sharesToBuy;
  const existingIdx = player.assets.findIndex(
    (a) => a.assetKind === 'stock' && a.tickerSymbol === tickerSymbol
  );

  let nextAssets: PlayerAsset[];
  if (existingIdx >= 0) {
    const existing = player.assets[existingIdx];
    const nextShares = (existing.shares ?? 0) + sharesToBuy;
    const nextLots = Math.round(nextShares / stockDef.tradeUnit);
    nextAssets = player.assets.map((a, idx) =>
      idx === existingIdx
        ? {
            ...a,
            title: `${stockDef.tickerSymbol} ${stockDef.companyName}（${nextLots} 張）`,
            cost: a.cost + totalCost,
            value: pricePerShare * nextShares,
            monthlyNet: a.monthlyNet + monthlyDivDelta,
            shares: nextShares,
          }
        : a
    );
  } else {
    nextAssets = [
      ...player.assets,
      {
        uid: uid('stk'),
        sourceId: `stock-${tickerSymbol}`,
        title: `${stockDef.tickerSymbol} ${stockDef.companyName}（${lots} 張）`,
        assetKind: 'stock',
        cost: totalCost,
        value: totalCost,
        monthlyNet: monthlyDivDelta,
        energy: 0,
        shares: sharesToBuy,
        tickerSymbol,
      },
    ];
  }

  let updated: PlayerState = {
    ...player,
    cash: player.cash - totalCost,
    assets: nextAssets,
  };
  let logs = appendLog(
    state,
    player.nickname,
    `買進 ${stockDef.tickerSymbol} ${stockDef.companyName} ${lots} 張（每股 ${formatNtd(pricePerShare)}），支出 ${formatNtd(totalCost)}，月股息 ${formatNtd(monthlyDivDelta, true)}。`,
    'positive'
  );

  const check = checkEscapeAndPromote(updated, { ...state, logs });
  updated = check.player;
  logs = check.logs;

  const players = state.players.map((p, i) => (i === state.currentPlayerIndex ? updated : p));
  return { ...state, players, logs };
}

export function sellStock(state: GameState, tickerSymbol: string, lots = 1): GameState {
  if (lots <= 0) return state;
  const stockDef = GAME_CONTENT.stocks.find((s) => s.tickerSymbol === tickerSymbol);
  if (!stockDef) return state;

  const player = state.players[state.currentPlayerIndex];
  const existingIdx = player.assets.findIndex(
    (a) => a.assetKind === 'stock' && a.tickerSymbol === tickerSymbol
  );
  if (existingIdx < 0) return state;

  const existing = player.assets[existingIdx];
  const currentShares = existing.shares ?? 0;
  const sharesToSell = Math.min(currentShares, stockDef.tradeUnit * lots);
  if (sharesToSell <= 0) return state;

  const pricePerShare = state.stockPrices[tickerSymbol] ?? stockDef.startPrice;
  const proceeds = pricePerShare * sharesToSell;
  const avgCostPerShare = currentShares > 0 ? existing.cost / currentShares : pricePerShare;
  const costBasisSold = Math.round(avgCostPerShare * sharesToSell);
  const pnl = proceeds - costBasisSold;

  const remainingShares = currentShares - sharesToSell;
  let nextAssets: PlayerAsset[];
  if (remainingShares <= 0) {
    nextAssets = player.assets.filter((_, idx) => idx !== existingIdx);
  } else {
    const remainingLots = Math.round(remainingShares / stockDef.tradeUnit);
    nextAssets = player.assets.map((a, idx) =>
      idx === existingIdx
        ? {
            ...a,
            title: `${stockDef.tickerSymbol} ${stockDef.companyName}（${remainingLots} 張）`,
            cost: Math.max(0, a.cost - costBasisSold),
            value: pricePerShare * remainingShares,
            monthlyNet: stockDef.dividendPerShare * remainingShares,
            shares: remainingShares,
          }
        : a
    );
  }

  const updated: PlayerState = {
    ...player,
    cash: player.cash + proceeds,
    assets: nextAssets,
  };
  const soldLots = Math.round(sharesToSell / stockDef.tradeUnit);
  const logs = appendLog(
    state,
    player.nickname,
    `賣出 ${stockDef.tickerSymbol} ${stockDef.companyName} ${soldLots} 張，入帳 ${formatNtd(proceeds)}（已實現損益 ${formatNtd(pnl, true)}）。`,
    pnl >= 0 ? 'positive' : 'negative'
  );

  const players = state.players.map((p, i) => (i === state.currentPlayerIndex ? updated : p));
  return { ...state, players, logs };
}

export function resolvePromptAction(
  state: GameState,
  action: 'accept' | 'decline',
  stockLots = 1
): GameState {
  if (!state.prompt) return state;
  const player = state.players[state.currentPlayerIndex];
  const metrics = computePlayerMetrics(player);
  let nextPlayer = { ...player };
  let logs = state.logs;

  const p = state.prompt;

  if (p.type === 'smallDeal') {
    if (action === 'accept') {
      const card: SmallDealDef = p.card;
      const isStock = card.assetKind === 'stock' && card.tickerSymbol;
      const unitCost = isStock
        ? (p.stockPrice ?? state.stockPrices[card.tickerSymbol!] ?? 5000) * 1000
        : card.cost;
      const totalCost = isStock ? unitCost * Math.max(1, stockLots) : unitCost;

      if (nextPlayer.cash < totalCost) return state;
      if (metrics.energyUsed + card.energyCost > metrics.energyCap) return state;

      const stockDef = isStock
        ? GAME_CONTENT.stocks.find((s) => s.tickerSymbol === card.tickerSymbol)
        : undefined;
      const monthlyNet = isStock
        ? (stockDef?.dividendPerShare ?? 15) * 1000 * Math.max(1, stockLots)
        : card.monthlyCashflow;

      const asset: PlayerAsset = {
        uid: uid('asset'),
        sourceId: card.id,
        title: isStock ? `${card.title}（${stockLots} 張）` : card.title,
        assetKind: card.assetKind,
        cost: totalCost,
        value: card.resaleValue ?? totalCost,
        monthlyNet,
        energy: card.energyCost,
        shares: isStock ? stockLots * 1000 : undefined,
        tickerSymbol: card.tickerSymbol,
        businessCategory: card.businessCategory,
      };

      const liabilities = [...nextPlayer.liabilities];
      if (card.loanPrincipal > 0) {
        liabilities.push({
          id: uid('bl'),
          kind: 'businessLoan',
          label: `${card.title} 貸款`,
          balance: card.loanPrincipal,
          monthlyPayment: card.loanMonthlyPayment,
          annualInterestRate: card.loanAnnualRate,
        });
      }

      nextPlayer = {
        ...nextPlayer,
        cash: nextPlayer.cash - totalCost,
        assets: [...nextPlayer.assets, asset],
        liabilities,
      };
      logs = appendLog(
        state,
        player.nickname,
        `買入「${asset.title}」，花費 ${formatNtd(totalCost)}，月現金流 ${formatNtd(monthlyNet, true)}。`,
        'positive'
      );
    } else {
      logs = appendLog(state, player.nickname, `放棄小機會「${p.card.title}」。`);
    }
  } else if (p.type === 'bigDeal') {
    if (action === 'accept') {
      const card: BigDealDef = p.card;
      if (nextPlayer.cash < card.downPayment) return state;
      if (metrics.energyUsed + card.energyCost > metrics.energyCap) return state;

      const monthlyLoan =
        card.loanPrincipal > 0
          ? computeMonthlyMortgage(card.loanPrincipal, card.loanAnnualRate, card.loanMonths || 240)
          : 0;
      const loanId = card.loanPrincipal > 0 ? uid('mort') : undefined;
      const liabilities = [...nextPlayer.liabilities];
      if (loanId) {
        liabilities.push({
          id: loanId,
          kind: card.assetKind === 'business' ? 'businessLoan' : 'investmentPropertyMortgage',
          label: `${card.title} 貸款`,
          balance: card.loanPrincipal,
          monthlyPayment: monthlyLoan,
          annualInterestRate: card.loanAnnualRate,
        });
      }

      const asset: PlayerAsset = {
        uid: uid('asset'),
        sourceId: card.id,
        title: card.title,
        assetKind: card.assetKind,
        cost: card.downPayment,
        value: card.price,
        monthlyNet: card.monthlyGrossIncome,
        energy: card.energyCost,
        region: card.region,
        buildingType: card.buildingType,
        businessCategory: card.businessCategory,
        linkedLiabilityId: loanId,
      };

      nextPlayer = {
        ...nextPlayer,
        cash: nextPlayer.cash - card.downPayment,
        assets: [...nextPlayer.assets, asset],
        liabilities,
      };
      logs = appendLog(
        state,
        player.nickname,
        `購入大機會「${card.title}」，頭期 ${formatNtd(card.downPayment)}，月毛收 ${formatNtd(card.monthlyGrossIncome)}（貸款月付 ${formatNtd(monthlyLoan)}）。`,
        'positive'
      );
    } else {
      logs = appendLog(state, player.nickname, `放棄大機會「${p.card.title}」。`);
    }
  } else if (p.type === 'doodad') {
    nextPlayer = { ...nextPlayer, cash: nextPlayer.cash - p.card.amount };
    logs = appendLog(
      state,
      player.nickname,
      `遭遇額外支出「${p.card.title}」，支付 ${formatNtd(p.card.amount)}。`,
      'negative'
    );
  } else if (p.type === 'charity') {
    if (action === 'accept' && nextPlayer.cash >= p.amount) {
      nextPlayer = {
        ...nextPlayer,
        cash: nextPlayer.cash - p.amount,
        charityTurns: nextPlayer.charityTurns + 3,
      };
      logs = appendLog(
        state,
        player.nickname,
        `捐款公益 ${formatNtd(p.amount)}，未來 3 回合可自由選擇擲 1 或 2 顆骰子！`,
        'positive'
      );
    } else {
      logs = appendLog(state, player.nickname, '本次略過公益捐款。');
    }
  } else if (p.type === 'baby') {
    if (nextPlayer.children < 3) {
      nextPlayer = { ...nextPlayer, children: nextPlayer.children + 1 };
      logs = appendLog(
        state,
        player.nickname,
        `迎接新生命！目前子女數 ${nextPlayer.children} 位，每月育兒支出增加 ${formatNtd(p.childMonthlyCost)}。`,
        'milestone'
      );
    } else {
      logs = appendLog(state, player.nickname, '家庭成員已達 3 位上限，本次不增加支出。');
    }
  } else if (p.type === 'unpaidLeave') {
    nextPlayer = {
      ...nextPlayer,
      cash: nextPlayer.cash - metrics.totalExpenses,
      skipTurns: nextPlayer.skipTurns + 1,
    };
    logs = appendLog(
      state,
      player.nickname,
      `遭遇無薪假／停工，須先行支付 1 個月支出 ${formatNtd(metrics.totalExpenses)} 並暫停 1 回合。`,
      'negative'
    );
  } else if (p.type === 'market') {
    const card: MarketDef = p.card;
    if (card.kind === 'universalCashGrant' && card.amountPerSeat) {
      nextPlayer = { ...nextPlayer, cash: nextPlayer.cash + card.amountPerSeat };
      logs = appendLog(
        state,
        player.nickname,
        `市場事件「${card.title}」，獲得現金補助 ${formatNtd(card.amountPerSeat)}！`,
        'positive'
      );
    } else if (card.kind === 'realEstateSaleOffer' && action === 'accept') {
      const targetIdx = nextPlayer.assets.findIndex(
        (a) =>
          (a.assetKind === 'realEstate' || a.assetKind === 'preSaleHouse') &&
          (!card.eligibleRegions || !a.region || card.eligibleRegions.includes(a.region))
      );
      if (targetIdx >= 0) {
        const asset = nextPlayer.assets[targetIdx];
        const salePrice = Math.round(asset.value * ((card.saleMultiplier ?? 11500) / 10000));
        const linkedLoan = asset.linkedLiabilityId
          ? nextPlayer.liabilities.find((l) => l.id === asset.linkedLiabilityId)
          : undefined;
        const netProceeds = salePrice - (linkedLoan?.balance ?? 0);
        nextPlayer = {
          ...nextPlayer,
          cash: nextPlayer.cash + netProceeds,
          assets: nextPlayer.assets.filter((_, idx) => idx !== targetIdx),
          liabilities: linkedLoan
            ? nextPlayer.liabilities.filter((l) => l.id !== linkedLoan.id)
            : nextPlayer.liabilities,
        };
        logs = appendLog(
          state,
          player.nickname,
          `把握「${card.title}」出售「${asset.title}」，結清房貸後淨回收現金 ${formatNtd(netProceeds, true)}！`,
          'positive'
        );
      } else {
        logs = appendLog(state, player.nickname, `市場事件「${card.title}」，目前無符合條件之不動產可出售。`);
      }
    } else {
      logs = appendLog(state, player.nickname, `市場事件「${card.title}」已結算。`);
    }
  } else if (p.type === 'fastInvestment') {
    if (action === 'accept' && nextPlayer.cash >= p.card.cost) {
      nextPlayer = {
        ...nextPlayer,
        cash: nextPlayer.cash - p.card.cost,
        fastTrackCashflowDay: nextPlayer.fastTrackCashflowDay + p.card.cashflowDayIncomeIncrease,
        fastTrackGainedIncrease: nextPlayer.fastTrackGainedIncrease + p.card.cashflowDayIncomeIncrease,
      };
      logs = appendLog(
        state,
        player.nickname,
        `投資東岸專案「${p.card.title}」，花費 ${formatNtd(p.card.cost)}，現金流日永久 +${formatNtd(p.card.cashflowDayIncomeIncrease)}！`,
        'positive'
      );
      if (nextPlayer.fastTrackGainedIncrease >= nextPlayer.fastTrackTargetIncrease) {
        nextPlayer = { ...nextPlayer, won: true };
        const players = state.players.map((pl, i) => (i === state.currentPlayerIndex ? nextPlayer : pl));
        return {
          ...state,
          players,
          phase: 'ended',
          prompt: null,
          winnerId: nextPlayer.id,
          logs: appendLog(
            { ...state, logs },
            player.nickname,
            '達成東岸現金流日成長目標，贏得本場「從薪開始」財務自由勝利！',
            'milestone'
          ),
        };
      }
    } else {
      logs = appendLog(state, player.nickname, `略過東岸投資「${p.card.title}」。`);
    }
  } else if (p.type === 'fastDream') {
    if (action === 'accept' && nextPlayer.cash >= p.dream.cost) {
      nextPlayer = { ...nextPlayer, cash: nextPlayer.cash - p.dream.cost, won: p.isOwnDream };
      logs = appendLog(
        state,
        player.nickname,
        `投入 ${formatNtd(p.dream.cost)} 實現夢想「${p.dream.title}」！`,
        'milestone'
      );
      if (p.isOwnDream) {
        const players = state.players.map((pl, i) => (i === state.currentPlayerIndex ? nextPlayer : pl));
        return {
          ...state,
          players,
          phase: 'ended',
          prompt: null,
          winnerId: nextPlayer.id,
          logs,
        };
      }
    } else {
      logs = appendLog(state, player.nickname, `經過夢想格「${p.dream.title}」。`);
    }
  } else if (p.type === 'fastRisk') {
    nextPlayer = { ...nextPlayer, cash: Math.max(0, nextPlayer.cash - p.lossAmount) };
    logs = appendLog(
      state,
      player.nickname,
      `遭遇東岸風險「${p.title}」，損失 ${formatNtd(p.lossAmount)}。`,
      'negative'
    );
  }

  // 檢查是否達成內圈逃離條件
  const check = checkEscapeAndPromote(nextPlayer, { ...state, logs });
  nextPlayer = check.player;
  logs = check.logs;

  const players = state.players.map((pl, i) => (i === state.currentPlayerIndex ? nextPlayer : pl));
  return advanceTurn({ ...state, players, logs });
}

export function runAiTurn(state: GameState, rng: () => number = Math.random): GameState {
  const player = state.players[state.currentPlayerIndex];
  if (player.isHuman || state.phase === 'ended') return state;

  let next = rollDiceAndMove(state, player.charityTurns > 0 ? 2 : 1, rng);
  if (next.phase !== 'prompt' || !next.prompt) return next;

  const current = next.players[next.currentPlayerIndex];
  const metrics = computePlayerMetrics(current);

  if (next.prompt.type === 'opportunityChoice') {
    const preferBig = current.cash >= 150_000_000 && rng() > 0.4;
    next = chooseOpportunitySize(next, preferBig ? 'big' : 'small', rng);
  }

  if (!next.prompt) return next;
  const pr = next.prompt;

  if (pr.type === 'smallDeal') {
    const isStock = pr.card.assetKind === 'stock' && pr.card.tickerSymbol;
    const cost = isStock
      ? (pr.stockPrice ?? next.stockPrices[pr.card.tickerSymbol!] ?? 5000) * 1000
      : pr.card.cost;
    const canAfford = current.cash >= cost && metrics.energyUsed + pr.card.energyCost <= metrics.energyCap;
    return resolvePromptAction(next, canAfford && (isStock || pr.card.monthlyCashflow > 0) ? 'accept' : 'decline', 1);
  }
  if (pr.type === 'bigDeal') {
    const canAfford =
      current.cash >= pr.card.downPayment &&
      metrics.energyUsed + pr.card.energyCost <= metrics.energyCap;
    return resolvePromptAction(next, canAfford ? 'accept' : 'decline');
  }
  if (pr.type === 'charity') {
    return resolvePromptAction(next, current.cash >= pr.amount * 3 ? 'accept' : 'decline');
  }
  if (pr.type === 'fastInvestment') {
    return resolvePromptAction(next, current.cash >= pr.card.cost ? 'accept' : 'decline');
  }
  if (pr.type === 'fastDream') {
    return resolvePromptAction(next, pr.isOwnDream && current.cash >= pr.dream.cost ? 'accept' : 'decline');
  }

  return resolvePromptAction(next, 'accept');
}
