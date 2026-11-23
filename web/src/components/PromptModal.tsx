import { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building2,
  HeartHandshake,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { computeMonthlyMortgage, computePlayerMetrics, formatNtd } from '../core/finance';
import type { GameState } from '../core/types';

const ASSET_KIND_LABELS: Record<string, string> = {
  business: '微型事業',
  activeSideBusiness: '主動副業',
  stock: '台股投資',
  tontine: '互助會',
  timeDeposit: '定期存款',
  endowmentInsurance: '儲蓄險',
  realEstate: '不動產',
  preSaleHouse: '預售屋',
};

interface PromptModalProps {
  state: GameState;
  onChooseOpportunity: (size: 'small' | 'big') => void;
  onResolve: (action: 'accept' | 'decline', stockLots?: number) => void;
  onTakeLoan: () => void;
}

export function PromptModal({
  state,
  onChooseOpportunity,
  onResolve,
  onTakeLoan,
}: PromptModalProps) {
  const [stockLots, setStockLots] = useState(1);
  const player = state.players[state.currentPlayerIndex];

  if (state.phase !== 'prompt' || !state.prompt || !player.isHuman) {
    return null;
  }

  const metrics = computePlayerMetrics(player);
  const prompt = state.prompt;

  return (
    <div className="fixed inset-0 z-50 bg-[#1A2421]/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="diorama-card w-full max-w-lg rounded-3xl overflow-hidden animate-card-deal">
        {prompt.type === 'opportunityChoice' && (
          <div>
            <div className="bg-[#245E50] text-white px-6 py-4 flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-[#E8A849]" />
              <h2 className="text-lg font-black">踏入機會格：請選擇機會規模</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#475550]">
                目前可用現金 <strong className="text-[#245E50]">{formatNtd(player.cash)}</strong>
                ，剩餘精力{' '}
                <strong className="text-[#245E50]">
                  {metrics.energyCap - metrics.energyUsed} / {metrics.energyCap}
                </strong>
                。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => onChooseOpportunity('small')}
                  className="p-4 rounded-2xl border-2 border-[#245E50] bg-white hover:bg-[#245E50]/5 text-left transition-all cursor-pointer"
                >
                  <div className="font-black text-base text-[#245E50]">小機會（低門檻）</div>
                  <p className="mt-1 text-xs text-[#5D6965] leading-relaxed">
                    台股 ETF、副業、機台或定存，適合累積初期現金流與本金。
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onChooseOpportunity('big')}
                  className="p-4 rounded-2xl border-2 border-[#2E8B99] bg-white hover:bg-[#2E8B99]/5 text-left transition-all cursor-pointer"
                >
                  <div className="font-black text-base text-[#2E8B99]">大機會（高槓桿）</div>
                  <p className="mt-1 text-xs text-[#5D6965] leading-relaxed">
                    雙北／中南部不動產與加盟事業，頭期較高但能加速脫離日常圈。
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {prompt.type === 'smallDeal' && (() => {
          const c = prompt.card;
          const isStock = c.assetKind === 'stock' && c.tickerSymbol;
          const unitCost = isStock
            ? (prompt.stockPrice ?? state.stockPrices[c.tickerSymbol!] ?? 5000) * 1000
            : c.cost;
          const totalCost = isStock ? unitCost * stockLots : unitCost;
          const lackingCash = player.cash < totalCost;
          const lackingEnergy = metrics.energyUsed + c.energyCost > metrics.energyCap;

          return (
            <div>
              <div className="bg-[#245E50] text-white px-6 py-4 flex items-center justify-between">
                <span className="font-black text-lg">小機會 · {c.title}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-bold">
                  {isStock ? `台股 ${c.tickerSymbol}` : (ASSET_KIND_LABELS[c.assetKind] ?? c.assetKind)}
                </span>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-white border border-[#EDE3CE]">
                    <div className="text-xs text-[#6B7672]">
                      {isStock ? '每張（1000 股）成本' : '投入成本'}
                    </div>
                    <div className="font-black text-base text-[#1E3B33] mt-0.5">
                      {formatNtd(totalCost)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#EDE3CE]">
                    <div className="text-xs text-[#6B7672]">預估月現金流</div>
                    <div
                      className={`font-black text-base mt-0.5 ${
                        c.monthlyCashflow >= 0 ? 'text-[#245E50]' : 'text-[#C85A32]'
                      }`}
                    >
                      {isStock ? '依持股配息' : formatNtd(c.monthlyCashflow, true)}
                    </div>
                  </div>
                </div>

                {c.energyCost > 0 && (
                  <div className="text-xs flex items-center gap-1.5 text-[#5D6965]">
                    <Zap className="w-4 h-4 text-[#E8A849]" />
                    <span>
                      消耗精力：<strong>{c.energyCost}</strong>（目前剩餘{' '}
                      {metrics.energyCap - metrics.energyUsed}）
                    </span>
                  </div>
                )}

                {isStock && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDE3CE]/60">
                    <span className="text-xs font-bold text-[#1E3B33]">購買張數（每張 1000 股）</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStockLots((v) => Math.max(1, v - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-[#D4C5A6] font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black">{stockLots}</span>
                      <button
                        type="button"
                        onClick={() => setStockLots((v) => Math.min(20, v + 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-[#D4C5A6] font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {lackingCash && (
                  <div className="p-3 rounded-xl bg-[#C85A32]/10 border border-[#C85A32]/30 flex items-center justify-between gap-2 text-xs text-[#9E3B33]">
                    <span>現金不足（尚差 {formatNtd(totalCost - player.cash)}）</span>
                    <button
                      type="button"
                      onClick={onTakeLoan}
                      className="px-3 py-1.5 rounded-lg bg-[#C85A32] text-white font-bold cursor-pointer shrink-0"
                    >
                      借信貸 +NT$ 100,000
                    </button>
                  </div>
                )}

                {lackingEnergy && (
                  <div className="text-xs font-bold text-[#C85A32]">
                    精力不足，無法承接此項需要投入心力的機會。
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={lackingCash || lackingEnergy}
                    onClick={() => {
                      onResolve('accept', stockLots);
                      setStockLots(1);
                    }}
                    className="diorama-btn-primary flex-1 py-3 rounded-xl font-bold disabled:opacity-45 cursor-pointer"
                  >
                    確認買入
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResolve('decline');
                      setStockLots(1);
                    }}
                    className="px-5 py-3 rounded-xl border border-[#D4C5A6] bg-white font-bold text-[#475550] hover:bg-[#EDE3CE] cursor-pointer"
                  >
                    放棄
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {prompt.type === 'bigDeal' && (() => {
          const c = prompt.card;
          const monthlyLoan =
            c.loanPrincipal > 0
              ? computeMonthlyMortgage(c.loanPrincipal, c.loanAnnualRate, c.loanMonths || 240)
              : 0;
          const netMonthly = c.monthlyGrossIncome - monthlyLoan;
          const lackingCash = player.cash < c.downPayment;
          const lackingEnergy = metrics.energyUsed + c.energyCost > metrics.energyCap;

          return (
            <div>
              <div className="bg-[#2E8B99] text-white px-6 py-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#FFF3D1]" />
                <span className="font-black text-lg">大機會 · {c.title}</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-white border border-[#EDE3CE]">
                    <div className="text-xs text-[#6B7672]">總價 / 頭期款</div>
                    <div className="font-black text-[#1E3B33] mt-0.5">
                      {formatNtd(c.downPayment)}
                    </div>
                    <div className="text-[11px] text-[#6B7672]">總價 {formatNtd(c.price)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#EDE3CE]">
                    <div className="text-xs text-[#6B7672]">預估月淨現金流</div>
                    <div
                      className={`font-black mt-0.5 ${
                        netMonthly >= 0 ? 'text-[#245E50]' : 'text-[#C85A32]'
                      }`}
                    >
                      {formatNtd(netMonthly, true)}
                    </div>
                    <div className="text-[11px] text-[#6B7672]">
                      毛收 {formatNtd(c.monthlyGrossIncome)} · 貸款月付 {formatNtd(monthlyLoan)}
                    </div>
                  </div>
                </div>

                {lackingCash && (
                  <div className="p-3 rounded-xl bg-[#C85A32]/10 border border-[#C85A32]/30 flex items-center justify-between gap-2 text-xs text-[#9E3B33]">
                    <span>頭期現金不足（尚差 {formatNtd(c.downPayment - player.cash)}）</span>
                    <button
                      type="button"
                      onClick={onTakeLoan}
                      className="px-3 py-1.5 rounded-lg bg-[#C85A32] text-white font-bold cursor-pointer shrink-0"
                    >
                      借信貸 +NT$ 100,000
                    </button>
                  </div>
                )}

                {lackingEnergy && (
                  <div className="text-xs font-bold text-[#C85A32]">
                    精力不足（需 {c.energyCost}，剩餘 {metrics.energyCap - metrics.energyUsed}）。
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={lackingCash || lackingEnergy}
                    onClick={() => onResolve('accept')}
                    className="diorama-btn-primary flex-1 py-3 rounded-xl font-bold disabled:opacity-45 cursor-pointer"
                  >
                    簽約買入
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolve('decline')}
                    className="px-5 py-3 rounded-xl border border-[#D4C5A6] bg-white font-bold text-[#475550] hover:bg-[#EDE3CE] cursor-pointer"
                  >
                    放棄
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {prompt.type === 'doodad' && (
          <div>
            <div className="bg-[#C85A32] text-white px-6 py-4 flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              <span className="font-black text-lg">生活額外支出</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-lg font-black text-[#1E3B33]">{prompt.card.title}</div>
              <p className="text-sm text-[#475550]">
                需支付費用 <strong className="text-[#C85A32]">{formatNtd(prompt.card.amount)}</strong>。
              </p>
              <button
                type="button"
                onClick={() => onResolve('accept')}
                className="diorama-btn-primary w-full py-3 rounded-xl font-bold cursor-pointer"
              >
                確認支付
              </button>
            </div>
          </div>
        )}

        {prompt.type === 'market' && (
          <div>
            <div className="bg-[#5B4B8A] text-white px-6 py-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-black text-lg">市場動向 · {prompt.card.title}</span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#475550]">
                {prompt.card.kind === 'realEstateSaleOffer'
                  ? `市場出現買家出價（估值倍率 ${((prompt.card.saleMultiplier ?? 11500) / 100).toFixed(0)}%），若您持有符合區域的不動產，可趁勢獲利了結。`
                  : prompt.card.kind === 'universalCashGrant'
                    ? `政策或市場紅利發放，每位玩家可獲得 ${formatNtd(prompt.card.amountPerSeat ?? 0)}。`
                    : '市場行情波動已反映於資產環境，請確認結算。'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onResolve('accept')}
                  className="diorama-btn-primary flex-1 py-3 rounded-xl font-bold cursor-pointer"
                >
                  {prompt.card.kind === 'realEstateSaleOffer' ? '出售符合條件不動產' : '確認結算'}
                </button>
                {prompt.card.kind === 'realEstateSaleOffer' && (
                  <button
                    type="button"
                    onClick={() => onResolve('decline')}
                    className="px-5 py-3 rounded-xl border border-[#D4C5A6] bg-white font-bold text-[#475550] cursor-pointer"
                  >
                    繼續持有
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {prompt.type === 'charity' && (
          <div>
            <div className="bg-[#2E8B99] text-white px-6 py-4 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5" />
              <span className="font-black text-lg">社區公益捐款</span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#475550]">
                捐出本月總收入 10%（<strong>{formatNtd(prompt.amount)}</strong>），接下來 3
                回合可自由選擇擲 1 顆或 2 顆骰子加速前進。
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={player.cash < prompt.amount}
                  onClick={() => onResolve('accept')}
                  className="diorama-btn-primary flex-1 py-3 rounded-xl font-bold disabled:opacity-45 cursor-pointer"
                >
                  暖心捐款
                </button>
                <button
                  type="button"
                  onClick={() => onResolve('decline')}
                  className="px-5 py-3 rounded-xl border border-[#D4C5A6] bg-white font-bold text-[#475550] cursor-pointer"
                >
                  本次略過
                </button>
              </div>
            </div>
          </div>
        )}

        {prompt.type === 'baby' && (
          <div>
            <div className="bg-[#C96B84] text-white px-6 py-4 font-black text-lg">
              家庭新成員報到
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#475550]">
                恭喜迎接新生命！每月育兒支出將增加{' '}
                <strong className="text-[#C85A32]">{formatNtd(prompt.childMonthlyCost)}</strong>
                （最多計算 3 位子女）。
              </p>
              <button
                type="button"
                onClick={() => onResolve('accept')}
                className="diorama-btn-primary w-full py-3 rounded-xl font-bold cursor-pointer"
              >
                開心中獎並更新報表
              </button>
            </div>
          </div>
        )}

        {prompt.type === 'unpaidLeave' && (
          <div>
            <div className="bg-[#5C6468] text-white px-6 py-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E8A849]" />
              <span className="font-black text-lg">遭遇無薪假／短暫停工</span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#475550]">
                須先支付 1 個月總支出{' '}
                <strong className="text-[#C85A32]">{formatNtd(metrics.totalExpenses)}</strong>
                ，並於下回合暫停移動一次。
              </p>
              <button
                type="button"
                onClick={() => onResolve('accept')}
                className="diorama-btn-primary w-full py-3 rounded-xl font-bold cursor-pointer"
              >
                承擔並調整腳步
              </button>
            </div>
          </div>
        )}

        {prompt.type === 'fastInvestment' && (
          <div>
            <div className="bg-[#2E8B99] text-white px-6 py-4 font-black text-lg">
              東岸夢想圈投資 · {prompt.card.title}
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-white border border-[#EDE3CE]">
                  <div className="text-xs text-[#6B7672]">投資門檻</div>
                  <div className="font-black text-[#1E3B33]">{formatNtd(prompt.card.cost)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#EDE3CE]">
                  <div className="text-xs text-[#6B7672]">現金流日永久加成</div>
                  <div className="font-black text-[#245E50]">
                    +{formatNtd(prompt.card.cashflowDayIncomeIncrease)}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={player.cash < prompt.card.cost}
                  onClick={() => onResolve('accept')}
                  className="diorama-btn-primary flex-1 py-3 rounded-xl font-bold disabled:opacity-45 cursor-pointer"
                >
                  確認投資
                </button>
                <button
                  type="button"
                  onClick={() => onResolve('decline')}
                  className="px-5 py-3 rounded-xl border border-[#D4C5A6] bg-white font-bold text-[#475550] cursor-pointer"
                >
                  略過
                </button>
              </div>
            </div>
          </div>
        )}

        {prompt.type === 'fastDream' && (
          <div>
            <div className="bg-[#E8A849] text-[#2B2111] px-6 py-4 flex items-center gap-2 font-black text-lg">
              <Sparkles className="w-5 h-5" />
              <span>夢想站 · {prompt.dream.title}</span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#475550]">
                {prompt.isOwnDream
                  ? `這正是你設定的人生夢想！只要投入 ${formatNtd(prompt.dream.cost)} 即可立刻圓夢獲勝。`
                  : `經過「${prompt.dream.title}」（圓夢資金 ${formatNtd(prompt.dream.cost)}）。`}
              </p>
              <div className="flex gap-3">
                {prompt.isOwnDream && (
                  <button
                    type="button"
                    disabled={player.cash < prompt.dream.cost}
                    onClick={() => onResolve('accept')}
                    className="diorama-btn-gold flex-1 py-3 rounded-xl font-black disabled:opacity-45 cursor-pointer"
                  >
                    投入資金，實現夢想！
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onResolve('decline')}
                  className="px-5 py-3 rounded-xl border border-[#D4C5A6] bg-white font-bold text-[#475550] flex-1 cursor-pointer"
                >
                  繼續前進
                </button>
              </div>
            </div>
          </div>
        )}

        {prompt.type === 'fastRisk' && (
          <div>
            <div className="bg-[#9E3B33] text-white px-6 py-4 font-black text-lg">
              東岸突發風險 · {prompt.title}
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#475550]">
                本次風險事件導致現金減少{' '}
                <strong className="text-[#C85A32]">{formatNtd(prompt.lossAmount)}</strong>。
              </p>
              <button
                type="button"
                onClick={() => onResolve('accept')}
                className="diorama-btn-primary w-full py-3 rounded-xl font-bold cursor-pointer"
              >
                確認承受
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
