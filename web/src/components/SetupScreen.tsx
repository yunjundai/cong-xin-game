import { useState } from 'react';
import { ArrowLeft, Briefcase, Sparkles, User, Zap } from 'lucide-react';
import { GAME_CONTENT } from '../core/engine';
import { formatNtd } from '../core/finance';
import { getDreamArtStyle, getPortraitStyle } from '../data/boardCoords';

interface SetupScreenProps {
  onBack: () => void;
  onConfirm: (opts: {
    playerName: string;
    professionId: string;
    dreamId: string;
    gender: 'M' | 'F';
    mode: 'standard' | 'quick';
  }) => void;
}

export function SetupScreen({ onBack, onConfirm }: SetupScreenProps) {
  const [playerName, setPlayerName] = useState('阿辰');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [mode, setMode] = useState<'standard' | 'quick'>('standard');
  const [professionId, setProfessionId] = useState(GAME_CONTENT.professions[7].id); // 預設軟體工程師
  const [dreamId, setDreamId] = useState(GAME_CONTENT.dreams[2].id); // 預設獨立書店

  const selectedProf =
    GAME_CONTENT.professions.find((p) => p.id === professionId) ?? GAME_CONTENT.professions[0];
  const selectedDream =
    GAME_CONTENT.dreams.find((d) => d.id === dreamId) ?? GAME_CONTENT.dreams[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      playerName: playerName.trim() || '玩家',
      professionId: selectedProf.id,
      dreamId: selectedDream.id,
      gender,
      mode,
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F1E3] text-[#262A2C] py-6 px-4 md:px-8">
      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">
        {/* 頁首 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-xl bg-white border border-[#DDD1B8] hover:bg-[#EDE3CE] transition-colors cursor-pointer"
              aria-label="返回主畫面"
            >
              <ArrowLeft className="w-5 h-5 text-[#245E50]" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1E3B33]">角色與夢想設定</h1>
              <p className="text-xs md:text-sm text-[#5D6965]">
                選擇你的起點職業與東岸夢想，並設定本場對局節奏
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="diorama-btn-primary px-7 py-3 rounded-xl font-bold text-base cursor-pointer"
          >
            進入小鎮日常圈
          </button>
        </div>

        {/* 基本資訊設定卡 */}
        <section className="diorama-card rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-[#245E50] mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> 玩家暱稱
            </label>
            <input
              type="text"
              required
              maxLength={12}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="輸入你的稱呼"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D4C5A6] focus:outline-none focus:ring-2 focus:ring-[#245E50]/40 font-medium"
            />
          </div>

          <div>
            <span className="block text-xs font-bold text-[#245E50] mb-1.5">角色外觀性別</span>
            <div className="grid grid-cols-2 gap-2">
              {(['M', 'F'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    gender === g
                      ? 'bg-[#245E50] text-white border-[#245E50] shadow-sm'
                      : 'bg-white text-[#475550] border-[#D4C5A6] hover:bg-[#EDE3CE]'
                  }`}
                >
                  {g === 'M' ? '男性立繪' : '女性立繪'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-[#245E50] mb-1.5">對局節奏</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['standard', '標準局'],
                  ['quick', '快速局（+2 月薪資金）'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2.5 px-2 rounded-xl text-xs md:text-sm font-bold border transition-all cursor-pointer ${
                    mode === m
                      ? 'bg-[#E8A849] text-[#2B2111] border-[#C98827] shadow-sm'
                      : 'bg-white text-[#475550] border-[#D4C5A6] hover:bg-[#EDE3CE]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 12 職業選擇器 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#1E3B33] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#245E50]" />
              <span>選擇起點職業（12 種台灣職場）</span>
            </h2>
            <span className="text-xs text-[#5D6965]">
              已選：<strong>{selectedProf.name}</strong>（月薪 {formatNtd(selectedProf.monthlySalary)}）
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {GAME_CONTENT.professions.map((prof, idx) => {
              const active = prof.id === professionId;
              const portrait = getPortraitStyle(idx, gender);
              const totalDebt = prof.startingLiabilities.reduce((a, b) => a + b.balance, 0);
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setProfessionId(prof.id)}
                  className={`text-left rounded-2xl p-3.5 transition-all cursor-pointer border-2 ${
                    active
                      ? 'bg-white border-[#245E50] shadow-[0_4px_0_#245E50]'
                      : 'bg-[#FFFDF8] border-[#DDD1B8] hover:border-[#245E50]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-xl shrink-0 border border-[#DDD1B8] bg-[#F7F1E3]"
                      style={{
                        backgroundImage: `url('${portrait.image}')`,
                        backgroundPosition: portrait.position,
                        backgroundSize: portrait.size,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-base text-[#1E3B33] truncate">{prof.name}</div>
                      <div className="text-xs font-bold text-[#245E50]">
                        月薪 {formatNtd(prof.monthlySalary)}
                      </div>
                      <div className="text-[11px] text-[#6B7672] flex items-center gap-1 mt-0.5">
                        <Zap className="w-3 h-3 text-[#E8A849]" /> 精力上限 {prof.energyBaseline}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#EDE3CE] flex justify-between text-[11px] text-[#5D6965]">
                    <span>現金 {formatNtd(prof.startingCash)}</span>
                    <span className="text-[#C85A32]">負債 {formatNtd(totalDebt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 7 項夢想選擇器 */}
        <section className="space-y-3 pb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#1E3B33] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#E8A849]" />
              <span>選擇你的東岸夢想</span>
            </h2>
            <span className="text-xs text-[#5D6965]">
              目標資金：<strong>{formatNtd(selectedDream.cost)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {GAME_CONTENT.dreams.map((dream, idx) => {
              const active = dream.id === dreamId;
              const art = getDreamArtStyle(idx);
              return (
                <button
                  key={dream.id}
                  type="button"
                  onClick={() => setDreamId(dream.id)}
                  className={`overflow-hidden text-left rounded-2xl transition-all cursor-pointer border-2 ${
                    active
                      ? 'bg-white border-[#2E8B99] shadow-[0_4px_0_#2E8B99]'
                      : 'bg-[#FFFDF8] border-[#DDD1B8] hover:border-[#2E8B99]/50'
                  }`}
                >
                  <div
                    className="h-28 w-full bg-[#EDE3CE]"
                    style={{
                      backgroundImage: `url('${art.image}')`,
                      backgroundPosition: art.position,
                      backgroundSize: art.size,
                    }}
                  />
                  <div className="p-3">
                    <div className="font-bold text-sm text-[#1E3B33] leading-snug">{dream.title}</div>
                    <div className="mt-1 text-xs font-bold text-[#2E8B99]">
                      圓夢資金 {formatNtd(dream.cost)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </form>
    </div>
  );
}
