import { useState } from 'react';
import {
  Coins,
  CreditCard,
  Landmark,
  PieChart,
  ScrollText,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { GAME_CONTENT } from '../core/engine';
import {
  computeAssetAllocation,
  computePlayerMetrics,
  formatNtd,
  LIABILITY_LABELS,
} from '../core/finance';
import type { GameState } from '../core/types';
import { getPortraitStyle } from '../data/boardCoords';

interface FinanceSidebarProps {
  state: GameState;
  onTakeLoan: () => void;
  onRepayLiability: (liabilityId: string) => void;
  onBuyStock: (tickerSymbol: string, lots: number) => void;
  onSellStock: (tickerSymbol: string, lots: number) => void;
}

export function FinanceSidebar({
  state,
  onTakeLoan,
  onRepayLiability,
  onBuyStock,
  onSellStock,
}: FinanceSidebarProps) {
  const [tab, setTab] = useState<'finance' | 'allocation' | 'stocks' | 'logs'>('finance');
  const human = state.players[0];
  const isHumanTurn = state.players[state.currentPlayerIndex].isHuman && state.phase !== 'ended';
  const metrics = computePlayerMetrics(human);
  const allocation = computeAssetAllocation(human);
  const profIdx = GAME_CONTENT.professions.findIndex((p) => p.id === human.profession.id);
  const portrait = getPortraitStyle(Math.max(0, profIdx), human.gender);
  const myDream = GAME_CONTENT.dreams.find((d) => d.id === human.dreamId);

  return (
    <aside className="space-y-4">
      {/* 個人角色與財務自由度卡片 */}
      <div className="diorama-card rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl border-2 border-[#245E50] shrink-0 bg-[#F7F1E3]"
            style={{
              backgroundImage: `url('${portrait.image}')`,
              backgroundPosition: portrait.position,
              backgroundSize: portrait.size,
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black text-lg text-[#1E3B33] truncate">{human.nickname}</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#245E50]/12 text-[#245E50]">
                {human.age} 歲 · {human.profession.name}
              </span>
            </div>
            <div className="text-xs text-[#5D6965] truncate mt-0.5">
              夢想：{myDream?.title ?? '—'}
            </div>
          </div>
        </div>

        {/* 自由完成度條 */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#245E50]">
              {human.track === 'inner' ? '財務自由完成度（被動收入 ÷ 總支出）' : '東岸現金流日目標'}
            </span>
            <span className="text-[#1E3B33]">{metrics.freedomCompletion.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#EDE3CE] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#245E50] to-[#2E8B99] transition-all duration-500"
              style={{ width: `${metrics.freedomCompletion}%` }}
            />
          </div>
        </div>

        {/* 四大核心 KPI */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl bg-white border border-[#EDE3CE]">
            <div className="text-[11px] text-[#6B7672] flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-[#245E50]" /> 手上現金
            </div>
            <div className="font-black text-base text-[#1E3B33] mt-0.5">
              {formatNtd(human.cash)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-[#EDE3CE]">
            <div className="text-[11px] text-[#6B7672] flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#E8A849]" /> 月淨現金流
            </div>
            <div
              className={`font-black text-base mt-0.5 ${
                metrics.monthlyCashflow >= 0 ? 'text-[#245E50]' : 'text-[#C85A32]'
              }`}
            >
              {formatNtd(metrics.monthlyCashflow, true)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-[#EDE3CE]">
            <div className="text-[11px] text-[#6B7672] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#E8A849]" /> 精力投入
            </div>
            <div className="font-black text-base text-[#1E3B33] mt-0.5">
              {metrics.energyUsed} / {metrics.energyCap}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-[#EDE3CE]">
            <div className="text-[11px] text-[#6B7672] flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-[#2E8B99]" /> 淨資產
            </div>
            <div className="font-black text-base text-[#1E3B33] mt-0.5">
              {formatNtd(metrics.netAssets)}
            </div>
          </div>
        </div>
      </div>

      {/* 四分頁儀表板：財務報表 / 資產配置 / 台股交易 / 對局紀錄 */}
      <div className="diorama-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-4 bg-[#EDE3CE] p-1 gap-1">
          {(
            [
              ['finance', '收支負債', CreditCard],
              ['allocation', '資產配置', PieChart],
              ['stocks', '台股交易', TrendingUp],
              ['logs', '對局紀錄', ScrollText],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                tab === id ? 'bg-white text-[#245E50] shadow-sm' : 'text-[#5D6965]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 max-h-[420px] overflow-y-auto space-y-4">
          {tab === 'finance' && (
            <>
              <div className="space-y-1.5 text-xs">
                <div className="font-black text-[#1E3B33] mb-1">每月收支明細</div>
                <div className="flex justify-between">
                  <span className="text-[#5D6965]">本業月薪</span>
                  <span className="font-bold text-[#245E50]">{formatNtd(metrics.salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D6965]">被動月收入（{human.assets.length} 項資產）</span>
                  <span className="font-bold text-[#245E50]">
                    {formatNtd(metrics.passiveIncome, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D6965]">固定生活支出（含 {human.children} 名子女）</span>
                  <span className="font-bold text-[#C85A32]">
                    -{formatNtd(metrics.fixedExpenses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D6965]">負債月付金</span>
                  <span className="font-bold text-[#C85A32]">
                    -{formatNtd(metrics.debtPayments)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EDE3CE] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1E3B33]">
                    負債項目（{human.liabilities.length}）
                  </span>
                  <button
                    type="button"
                    disabled={!isHumanTurn}
                    onClick={onTakeLoan}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#C85A32]/12 text-[#C85A32] hover:bg-[#C85A32]/20 disabled:opacity-40 cursor-pointer"
                  >
                    + 借信貸 NT$ 100,000
                  </button>
                </div>

                {human.liabilities.length === 0 ? (
                  <div className="text-xs text-[#245E50] bg-[#245E50]/8 rounded-xl p-2.5 font-medium">
                    目前已無任何負債，財務體質極佳。
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {human.liabilities.map((l) => {
                      const canRepay = isHumanTurn && human.cash >= l.balance;
                      return (
                        <div
                          key={l.id}
                          className="p-2.5 rounded-xl bg-white border border-[#EDE3CE] flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#1E3B33]">
                              {l.label ?? LIABILITY_LABELS[l.kind]}
                            </div>
                            <div className="text-[11px] text-[#6B7672]">
                              餘額 {formatNtd(l.balance)} · 月付 {formatNtd(l.monthlyPayment)}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={!canRepay}
                            onClick={() => onRepayLiability(l.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#245E50] text-white disabled:opacity-35 cursor-pointer shrink-0"
                          >
                            清償
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'allocation' && (
            <div className="space-y-4">
              {/* 總資產配置比例長條圖 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-[#1E3B33]">總資產配置結構</span>
                  <span className="font-bold text-[#245E50]">
                    總資產 {formatNtd(allocation.totalGrossAssets)}
                  </span>
                </div>

                <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-[#EDE3CE]">
                  {allocation.items.map(
                    (item) =>
                      item.percent > 0 && (
                        <div
                          key={item.key}
                          style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                          title={`${item.label}：${formatNtd(item.amount)}（${item.percent.toFixed(1)}%）`}
                          className="h-full transition-all duration-500"
                        />
                      )
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  {allocation.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-white border border-[#EDE3CE]"
                    >
                      <span className="flex items-center gap-2 font-bold text-[#1E3B33]">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                      </span>
                      <span className="text-[#475550] font-medium">
                        {formatNtd(item.amount)}{' '}
                        <strong className="text-[#1E3B33] ml-1">{item.percent.toFixed(1)}%</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 持有資產明細清單 */}
              <div className="pt-3 border-t border-[#EDE3CE] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-[#1E3B33]">
                    持有資產明細（{human.assets.length} 項）
                  </span>
                  <span className="text-[11px] text-[#5D6965]">
                    負債比{' '}
                    {allocation.totalGrossAssets > 0
                      ? ((metrics.totalDebt / allocation.totalGrossAssets) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>

                {human.assets.length === 0 ? (
                  <div className="text-xs text-[#5D6965] bg-[#EDE3CE]/50 rounded-xl p-3">
                    尚未配置任何投資資產。您可切換至「台股交易」自由買進台股 ETF，或於機會格佈局資產。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {human.assets.map((a) => (
                      <div
                        key={a.uid}
                        className="p-2.5 rounded-xl bg-white border border-[#EDE3CE] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-[#1E3B33]">{a.title}</span>
                          <span className="font-bold text-[#245E50]">
                            {formatNtd(a.monthlyNet, true)}/月
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#6B7672]">
                          <span>
                            現值 {formatNtd(a.value)}（成本 {formatNtd(a.cost)}）
                          </span>
                          {a.energy > 0 && <span>精力 -{a.energy}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'stocks' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[#1E3B33]">台股即時交易（每張 1000 股）</span>
                <span className="text-[11px] text-[#5D6965]">
                  {isHumanTurn ? '目前可自由下單' : '等待你的回合'}
                </span>
              </div>

              {GAME_CONTENT.stocks.map((s) => {
                const price = state.stockPrices[s.tickerSymbol] ?? s.startPrice;
                const lotCost = price * s.tradeUnit;
                const monthlyDivPerLot = s.dividendPerShare * s.tradeUnit;
                const diff = price - s.startPrice;
                const holding = human.assets.find(
                  (a) => a.assetKind === 'stock' && a.tickerSymbol === s.tickerSymbol
                );
                const heldLots = holding?.shares ? Math.round(holding.shares / s.tradeUnit) : 0;
                const unrealizedPnl = holding ? holding.value - holding.cost : 0;
                const canBuy = isHumanTurn && human.cash >= lotCost;
                const canSell = isHumanTurn && heldLots > 0;

                return (
                  <div
                    key={s.tickerSymbol}
                    className="p-3 rounded-xl bg-white border border-[#EDE3CE] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-[#1E3B33]">
                          {s.tickerSymbol} {s.companyName}
                        </div>
                        <div className="text-[11px] text-[#6B7672]">
                          每張 {formatNtd(lotCost)} · 月配息 {formatNtd(monthlyDivPerLot)}/張
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm text-[#1E3B33]">{formatNtd(price)}</div>
                        <div
                          className={`text-[11px] font-bold ${
                            diff >= 0 ? 'text-[#245E50]' : 'text-[#C85A32]'
                          }`}
                        >
                          {diff >= 0 ? '▲' : '▼'} {formatNtd(Math.abs(diff))}
                        </div>
                      </div>
                    </div>

                    {heldLots > 0 && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-[#2E8B99]/10 text-[#1E3B33]">
                        <span>
                          已持有 <strong>{heldLots} 張</strong>（現值 {formatNtd(holding!.value)}）
                        </span>
                        <span
                          className={`font-bold ${
                            unrealizedPnl >= 0 ? 'text-[#245E50]' : 'text-[#C85A32]'
                          }`}
                        >
                          損益 {formatNtd(unrealizedPnl, true)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => onBuyStock(s.tickerSymbol, 1)}
                        className="flex-1 py-1.5 rounded-lg bg-[#245E50] text-white font-bold text-[11px] disabled:opacity-35 cursor-pointer"
                      >
                        買進 1 張
                      </button>
                      <button
                        type="button"
                        disabled={!canSell}
                        onClick={() => onSellStock(s.tickerSymbol, 1)}
                        className="px-3 py-1.5 rounded-lg bg-[#C85A32] text-white font-bold text-[11px] disabled:opacity-35 cursor-pointer"
                      >
                        賣 1 張
                      </button>
                      {heldLots > 1 && (
                        <button
                          type="button"
                          disabled={!canSell}
                          onClick={() => onSellStock(s.tickerSymbol, heldLots)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#C85A32] text-[#C85A32] font-bold text-[11px] disabled:opacity-35 cursor-pointer"
                        >
                          全賣
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'logs' && (
            <div className="space-y-2">
              {state.logs.map((log) => (
                <div
                  key={log.id}
                  className="text-xs p-2.5 rounded-xl bg-white border border-[#EDE3CE]"
                >
                  <div className="flex justify-between text-[10px] text-[#6B7672] mb-0.5">
                    <span className="font-bold text-[#245E50]">{log.playerName}</span>
                    <span>第 {log.turn} 回合</span>
                  </div>
                  <p
                    className={`leading-relaxed ${
                      log.tone === 'positive'
                        ? 'text-[#245E50] font-medium'
                        : log.tone === 'negative'
                          ? 'text-[#C85A32]'
                          : log.tone === 'milestone'
                            ? 'text-[#1E3B33] font-bold'
                            : 'text-[#475550]'
                    }`}
                  >
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
