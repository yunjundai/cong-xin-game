import { useState } from 'react';
import { Dices, MapPin } from 'lucide-react';
import { GAME_CONTENT } from '../core/engine';
import type { GameState } from '../core/types';
import {
  getInnerBoardCoords,
  getOuterBoardCoords,
  INNER_TILE_META,
  OUTER_TILE_META,
} from '../data/boardCoords';
import { soundEngine } from '../services/sound';
import { DiceFace } from './DiceFace';

export interface FloatingFeedback {
  id: number;
  text: string;
  positive: boolean;
}

interface DioramaBoardProps {
  state: GameState;
  viewTrack: 'inner' | 'outer';
  floatingFeedback: FloatingFeedback | null;
  celebrating: boolean;
  onChangeViewTrack: (track: 'inner' | 'outer') => void;
  onRoll: (diceCount: 1 | 2) => void;
}

const TOKEN_COLORS = [
  'bg-[#245E50] ring-[#FFF3D1] text-white',
  'bg-[#C85A32] ring-[#FFF3D1] text-white',
  'bg-[#2E8B99] ring-[#FFF3D1] text-white',
  'bg-[#6B549B] ring-[#FFF3D1] text-white',
];

const INNER_COORDS = getInnerBoardCoords();
const OUTER_COORDS = getOuterBoardCoords();

export function DioramaBoard({
  state,
  viewTrack,
  floatingFeedback,
  celebrating,
  onChangeViewTrack,
  onRoll,
}: DioramaBoardProps) {
  const [isRollingAnim, setIsRollingAnim] = useState(false);
  const [previewDice, setPreviewDice] = useState<number[]>([3]);
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isHumanRolling = currentPlayer.isHuman && state.phase === 'rolling' && !isRollingAnim;
  const coords = viewTrack === 'inner' ? INNER_COORDS : OUTER_COORDS;
  const bgImage =
    viewTrack === 'inner'
      ? './assets/art/town_diorama.jpg'
      : './assets/art/coast_diorama.jpg';

  const triggerRoll = (diceCount: 1 | 2) => {
    if (!isHumanRolling) return;
    const count = currentPlayer.track === 'outer' ? 2 : diceCount;
    setIsRollingAnim(true);
    soundEngine.playDiceRoll();
    const interval = window.setInterval(() => {
      setPreviewDice(
        Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
      );
    }, 75);
    window.setTimeout(() => {
      window.clearInterval(interval);
      setIsRollingAnim(false);
      soundEngine.playStep();
      onRoll(diceCount);
    }, 420);
  };

  const playersOnTrack = state.players
    .map((p, idx) => ({ player: p, idx }))
    .filter(({ player }) => player.track === viewTrack);

  return (
    <div className="diorama-card rounded-2xl overflow-hidden flex flex-col">
      {/* 棋盤頂部切換列 */}
      <div className="px-4 py-2.5 bg-[#FFFDF8] border-b border-[#DDD1B8] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#245E50]" />
          <span className="font-black text-sm text-[#1E3B33]">
            {viewTrack === 'inner' ? '內圈 · 小鎮日常圈（24 格）' : '外圈 · 東岸夢想圈（28 格）'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#EDE3CE] text-[#475550] font-bold">
            第 {state.turn} 回合
          </span>
        </div>

        <div className="inline-flex rounded-xl bg-[#EDE3CE] p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onChangeViewTrack('inner');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTrack === 'inner'
                ? 'bg-[#245E50] text-white shadow-sm'
                : 'text-[#475550] hover:text-[#1E3B33]'
            }`}
          >
            小鎮日常圈
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onChangeViewTrack('outer');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTrack === 'outer'
                ? 'bg-[#2E8B99] text-white shadow-sm'
                : 'text-[#475550] hover:text-[#1E3B33]'
            }`}
          >
            東岸夢想圈
          </button>
        </div>
      </div>

      {/* 16:9 等角微縮盤面容器 */}
      <div className="relative w-full aspect-video bg-[#2D251C] overflow-hidden select-none">
        <img
          src={bgImage}
          alt={viewTrack === 'inner' ? '小鎮日常圈微縮盤面' : '東岸夢想圈微縮盤面'}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* 格位徽章層 */}
        {coords.map((pt, idx) => {
          const meta =
            viewTrack === 'inner'
              ? INNER_TILE_META[GAME_CONTENT.board[idx]]
              : OUTER_TILE_META[GAME_CONTENT.fast_board[idx]];
          const isCurrentSpot =
            currentPlayer.track === viewTrack && currentPlayer.position === idx;

          return (
            <div
              key={`${viewTrack}-${idx}`}
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              title={`第 ${idx + 1} 格：${meta.label}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-xs font-black shadow-md transition-transform ${meta.bg} ${meta.border} ${meta.text} ${
                isCurrentSpot
                  ? 'scale-125 ring-4 ring-[#E8A849]/90 animate-tile-ripple z-20'
                  : 'z-10 opacity-95'
              }`}
            >
              {meta.short}
            </div>
          );
        })}

        {/* 玩家立體棋子層 */}
        {playersOnTrack.map(({ player, idx }) => {
          const pt = coords[player.position] ?? coords[0];
          // 同格多玩家採 2x2 錯落展開，避免彼此遮擋與蓋住格位圓標
          const sameTilePeers = playersOnTrack.filter(
            (p) => p.player.position === player.position
          );
          const peerOffset = sameTilePeers.findIndex((p) => p.player.id === player.id);
          const colShift = sameTilePeers.length > 1 ? (peerOffset % 2 === 0 ? -3.4 : 3.4) : 0;
          const rowShift = sameTilePeers.length > 2 ? (peerOffset < 2 ? -5.8 : -2.6) : -4.2;
          const dx = colShift;
          const dy = rowShift;

          const isActive = idx === state.currentPlayerIndex;

          return (
            <div
              key={player.id}
              style={{
                left: `${pt.x + dx}%`,
                top: `${pt.y + dy}%`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out ${
                isActive ? 'z-30 animate-token-hop' : 'z-20'
              }`}
            >
              <div
                className={`px-2 py-0.5 rounded-full ring-2 text-[10px] sm:text-xs font-black shadow-lg whitespace-nowrap flex items-center gap-1 ${TOKEN_COLORS[idx % TOKEN_COLORS.length]}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span>{player.nickname}</span>
              </div>
              <div className="w-2 h-2 rotate-45 mx-auto -mt-1 bg-inherit" />
            </div>
          );
        })}

        {/* 浮動金錢變動飄字特效 */}
        {floatingFeedback && (
          <div
            key={floatingFeedback.id}
            className={`absolute left-1/2 top-[30%] z-40 pointer-events-none px-4 py-1.5 rounded-full font-black text-sm sm:text-base shadow-xl border-2 animate-float-delta ${
              floatingFeedback.positive
                ? 'bg-[#245E50] text-[#FFF3D1] border-[#A7D7C5]'
                : 'bg-[#C85A32] text-white border-[#F7C7B5]'
            }`}
          >
            {floatingFeedback.text}
          </div>
        )}

        {/* 慶祝彩帶粒子特效（晉升東岸圈／勝利） */}
        {celebrating && (
          <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                style={{
                  left: `${(i * 4.2) % 98}%`,
                  animationDelay: `${(i % 6) * 0.14}s`,
                  backgroundColor: ['#E8A849', '#245E50', '#2E8B99', '#C85A32', '#FFF3D1'][i % 5],
                }}
                className="absolute top-0 w-2.5 h-4 rounded-xs animate-confetti"
              />
            ))}
          </div>
        )}

        {/* 中央低干擾廣場：微縮擲骰控制浮層 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
          <div className="bg-[#FFFDF8]/94 backdrop-blur-sm border-2 border-[#DDD1B8] rounded-2xl px-4 py-3 shadow-xl text-center min-w-[205px] sm:min-w-[245px]">
            <div className="text-[11px] font-bold text-[#5D6965]">
              目前回合：
              <span className="text-[#1E3B33] font-black ml-1">{currentPlayer.nickname}</span>
              <span className="ml-1 text-[#245E50]">（{currentPlayer.profession.name}）</span>
            </div>

            {/* 實體象牙紅點骰子視覺區 */}
            <div className="mt-2 flex items-center justify-center gap-2.5 min-h-[44px]">
              {isRollingAnim ? (
                previewDice.map((d, i) => <DiceFace key={i} value={d} rolling />)
              ) : state.lastDice.length > 0 ? (
                <>
                  {state.lastDice.map((d, i) => (
                    <DiceFace key={i} value={d} />
                  ))}
                  <span className="text-xs font-black text-[#C85A32] ml-0.5">
                    = {state.lastDice.reduce((a, b) => a + b, 0)} 點
                  </span>
                </>
              ) : (
                <DiceFace value={1} />
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-center gap-2">
              {isHumanRolling ? (
                <>
                  <button
                    type="button"
                    onClick={() => triggerRoll(1)}
                    className="diorama-btn-gold px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                    <span>{currentPlayer.track === 'outer' ? '擲 2 顆骰子' : '擲骰前進'}</span>
                  </button>
                  {currentPlayer.track === 'inner' && currentPlayer.charityTurns > 0 && (
                    <button
                      type="button"
                      onClick={() => triggerRoll(2)}
                      className="diorama-btn-primary px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      公益 2 骰（餘 {currentPlayer.charityTurns}）
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs font-bold text-[#245E50] py-1.5 px-3 rounded-lg bg-[#EDE3CE]/80">
                  {isRollingAnim
                    ? '骰子滾動中...'
                    : state.phase === 'ended'
                      ? '本場對局已圓滿結束'
                      : currentPlayer.isHuman
                        ? '請於彈出卡片做出決策'
                        : '電腦玩家思考決策中...'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部格位圖例 */}
      <div className="px-4 py-2 bg-[#FFFDF8] border-t border-[#DDD1B8] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#5D6965]">
        {Object.entries(viewTrack === 'inner' ? INNER_TILE_META : OUTER_TILE_META).map(
          ([key, meta]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className={`w-4 h-4 rounded-full text-[9px] font-black inline-flex items-center justify-center ${meta.bg} ${meta.text}`}
              >
                {meta.short}
              </span>
              <span>{meta.label}</span>
            </span>
          )
        )}
      </div>
    </div>
  );
}
