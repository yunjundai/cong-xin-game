import { describe, expect, it } from 'vitest';
import {
  buyStock,
  chooseOpportunitySize,
  createInitialGameState,
  repayLiability,
  resolvePromptAction,
  rollDiceAndMove,
  runAiTurn,
  sellStock,
  takePersonalLoan,
} from './engine';
import { computeAssetAllocation, computePlayerMetrics, formatNtd } from './finance';

describe('從薪開始核心規則引擎測試', () => {
  it('能以 NTD_CENT 精準計算初始財務報表與自由完成度', () => {
    const state = createInitialGameState({
      playerName: '測試玩家',
      professionId: 'softwareEngineer',
      dreamId: 'world-tour',
      gender: 'M',
      mode: 'standard',
      aiCount: 3,
    });
    expect(state.players).toHaveLength(4);
    const human = state.players[0];
    const metrics = computePlayerMetrics(human);
    expect(metrics.salary).toBe(6_600_000);
    expect(metrics.passiveIncome).toBe(0);
    expect(metrics.freedomCompletion).toBe(0);
    expect(formatNtd(metrics.salary)).toBe('NT$ 66,000');
  });

  it('申請信用貸款與清償負債帳務守恆', () => {
    let state = createInitialGameState({
      playerName: '測試玩家',
      professionId: 'securityGuard',
      dreamId: 'world-tour',
      gender: 'M',
      mode: 'standard',
      aiCount: 1,
    });
    const beforeCash = state.players[0].cash;
    const beforeDebtCount = state.players[0].liabilities.length;

    state = takePersonalLoan(state, 1);
    expect(state.players[0].cash).toBe(beforeCash + 10_000_000);
    expect(state.players[0].liabilities).toHaveLength(beforeDebtCount + 1);

    const newLoanId = state.players[0].liabilities[state.players[0].liabilities.length - 1].id;
    state = repayLiability(state, newLoanId);
    expect(state.players[0].cash).toBe(beforeCash);
    expect(state.players[0].liabilities).toHaveLength(beforeDebtCount);
  });

  it('擲骰移動、經過發薪日與 AI 回合可完整運轉', () => {
    let state = createInitialGameState({
      playerName: '測試玩家',
      professionId: 'doctor',
      dreamId: 'east-coast-ocean-library',
      gender: 'F',
      mode: 'quick',
      aiCount: 1,
    });

    // 固定 rng = 0.0 -> 擲出 1 點 -> 第 2 格為 payday
    state = rollDiceAndMove(state, 1, () => 0.0);
    expect(state.lastDice).toEqual([1]);
    expect(state.currentPlayerIndex).toBe(1);

    // 執行 AI 回合
    state = runAiTurn(state, () => 0.3);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turn).toBe(2);
  });

  it('機會格可正確抽取並購買或放棄卡片', () => {
    let state = createInitialGameState({
      playerName: '測試玩家',
      professionId: 'pilot',
      dreamId: 'world-tour',
      gender: 'M',
      mode: 'quick',
      aiCount: 0,
    });
    // 移動 2 步到 index 2 (opportunity)
    state = rollDiceAndMove(state, 1, () => 0.2); // floor(0.2*6)+1 = 2
    expect(state.prompt?.type).toBe('opportunityChoice');

    state = chooseOpportunitySize(state, 'small', () => 0.0);
    expect(state.prompt?.type).toBe('smallDeal');

    state = resolvePromptAction(state, 'accept');
    expect(state.phase).toBe('rolling');
    expect(state.players[0].assets.length).toBeGreaterThanOrEqual(1);
  });

  it('可隨時買進賣出台股並即時更新五大資產配置比例', () => {
    let state = createInitialGameState({
      playerName: '測試玩家',
      professionId: 'doctor',
      dreamId: 'world-tour',
      gender: 'M',
      mode: 'quick',
      aiCount: 0,
    });

    const initialCash = state.players[0].cash;
    // 買進 2 張 0056（每張 3600 * 1000 = 3,600,000 分 = NT$ 36,000）
    state = buyStock(state, '0056', 2);
    expect(state.players[0].cash).toBe(initialCash - 7_200_000);
    expect(state.players[0].assets).toHaveLength(1);
    expect(state.players[0].assets[0].shares).toBe(2000);

    const alloc = computeAssetAllocation(state.players[0]);
    const stockSlice = alloc.items.find((i) => i.key === 'stock');
    expect(stockSlice?.amount).toBe(7_200_000);
    const totalPct = alloc.items.reduce((acc, i) => acc + i.percent, 0);
    expect(Math.round(totalPct)).toBe(100);

    // 賣出 1 張並再賣出剩餘 1 張
    state = sellStock(state, '0056', 1);
    expect(state.players[0].assets[0].shares).toBe(1000);
    state = sellStock(state, '0056', 1);
    expect(state.players[0].assets).toHaveLength(0);
    expect(state.players[0].cash).toBe(initialCash);
  });
});
