import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';
import { DioramaBoard, type FloatingFeedback } from './components/DioramaBoard';
import { FinanceSidebar } from './components/FinanceSidebar';
import { PromptModal } from './components/PromptModal';
import { SetupScreen } from './components/SetupScreen';
import { SplashScreen } from './components/SplashScreen';
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
} from './core/engine';
import { computePlayerMetrics, formatNtd } from './core/finance';
import type { GameState } from './core/types';
import { soundEngine } from './services/sound';

export function App() {
  const [screen, setScreen] = useState<'splash' | 'setup' | 'playing'>('splash');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [viewTrack, setViewTrack] = useState<'inner' | 'outer'>('inner');
  const [muted, setMuted] = useState(false);
  const [floatingFeedback, setFloatingFeedback] = useState<FloatingFeedback | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const prevCashRef = useRef<number | null>(null);
  const prevTrackRef = useRef<'inner' | 'outer'>('inner');
  const feedbackIdRef = useRef(0);

  // 偵測玩家現金與軌道變化，觸發浮動金錢飄字、音效與慶祝彩帶
  useEffect(() => {
    if (!gameState) {
      prevCashRef.current = null;
      prevTrackRef.current = 'inner';
      return;
    }
    const human = gameState.players[0];

    if (prevCashRef.current !== null && human.cash !== prevCashRef.current) {
      const delta = human.cash - prevCashRef.current;
      feedbackIdRef.current += 1;
      setFloatingFeedback({
        id: feedbackIdRef.current,
        text: formatNtd(delta, true),
        positive: delta > 0,
      });
      if (delta > 0) {
        soundEngine.playPayday();
      } else {
        soundEngine.playExpense();
      }
    }
    prevCashRef.current = human.cash;

    if (human.track === 'outer' && prevTrackRef.current === 'inner') {
      setViewTrack('outer');
      setCelebrating(true);
      soundEngine.playMilestone();
      const timer = window.setTimeout(() => setCelebrating(false), 2400);
      prevTrackRef.current = 'outer';
      return () => window.clearTimeout(timer);
    }
    prevTrackRef.current = human.track;
  }, [gameState]);

  // 獲勝慶祝音效與彩帶
  useEffect(() => {
    if (gameState?.winnerId) {
      setCelebrating(true);
      soundEngine.playMilestone();
    }
  }, [gameState?.winnerId]);

  // AI 電腦玩家自動接力回合
  useEffect(() => {
    if (screen !== 'playing' || !gameState || gameState.phase === 'ended') return;
    const current = gameState.players[gameState.currentPlayerIndex];
    if (current.isHuman) return;

    const timer = window.setTimeout(() => {
      setGameState((prev) => (prev ? runAiTurn(prev) : prev));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [screen, gameState]);

  if (screen === 'splash') {
    return (
      <SplashScreen
        onStart={() => {
          soundEngine.playClick();
          setScreen('setup');
        }}
      />
    );
  }

  if (screen === 'setup' || !gameState) {
    return (
      <SetupScreen
        onBack={() => {
          soundEngine.playClick();
          setScreen('splash');
        }}
        onConfirm={(opts) => {
          soundEngine.playMilestone();
          const initial = createInitialGameState({ ...opts, aiCount: 3 });
          prevCashRef.current = initial.players[0].cash;
          prevTrackRef.current = 'inner';
          setFloatingFeedback(null);
          setCelebrating(false);
          setGameState(initial);
          setViewTrack('inner');
          setScreen('playing');
        }}
      />
    );
  }

  const winner = gameState.winnerId
    ? gameState.players.find((p) => p.id === gameState.winnerId)
    : null;

  return (
    <div className="min-h-screen bg-[#F7F1E3] text-[#262A2C] flex flex-col">
      {/* 頂部狀態列 */}
      <header className="bg-[#245E50] text-white px-4 md:px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-black text-lg tracking-wide">從薪開始</span>
          <span className="hidden sm:inline text-xs text-[#FFF3D1]/85">
            把日子過成喜歡的樣子 · 微縮桌遊純網頁版
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 text-xs">
            {gameState.players.map((p, idx) => {
              const m = computePlayerMetrics(p);
              const isTurn = idx === gameState.currentPlayerIndex;
              return (
                <div
                  key={p.id}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    isTurn
                      ? 'bg-[#E8A849] text-[#2B2111] border-[#FFF3D1] font-black'
                      : 'bg-white/10 text-white/90 border-white/15'
                  }`}
                >
                  {p.nickname} · {m.freedomCompletion.toFixed(0)}%
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setMuted(soundEngine.toggleMute())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors cursor-pointer"
            title={muted ? '開啟桌遊音效' : '靜音'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{muted ? '靜音中' : '音效開'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setScreen('setup');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新開局</span>
          </button>
        </div>
      </header>

      {/* 主戰場：左等角微縮棋盤 + 右財務儀表板 */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 md:p-5 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8">
          <DioramaBoard
            state={gameState}
            viewTrack={viewTrack}
            floatingFeedback={floatingFeedback}
            celebrating={celebrating}
            onChangeViewTrack={setViewTrack}
            onRoll={(diceCount) =>
              setGameState((prev) => (prev ? rollDiceAndMove(prev, diceCount) : prev))
            }
          />
        </div>
        <div className="xl:col-span-4">
          <FinanceSidebar
            state={gameState}
            onTakeLoan={() => {
              soundEngine.playExpense();
              setGameState((prev) => (prev ? takePersonalLoan(prev, 1) : prev));
            }}
            onRepayLiability={(id) => {
              soundEngine.playSell();
              setGameState((prev) => (prev ? repayLiability(prev, id) : prev));
            }}
            onBuyStock={(ticker, lots) => {
              soundEngine.playPurchase();
              setGameState((prev) => (prev ? buyStock(prev, ticker, lots) : prev));
            }}
            onSellStock={(ticker, lots) => {
              soundEngine.playSell();
              setGameState((prev) => (prev ? sellStock(prev, ticker, lots) : prev));
            }}
          />
        </div>
      </main>

      {/* 互動事件卡片彈窗 */}
      <PromptModal
        state={gameState}
        onChooseOpportunity={(size) => {
          soundEngine.playClick();
          setGameState((prev) => (prev ? chooseOpportunitySize(prev, size) : prev));
        }}
        onResolve={(action, lots) => {
          if (action === 'accept') soundEngine.playPurchase();
          else soundEngine.playClick();
          setGameState((prev) => (prev ? resolvePromptAction(prev, action, lots) : prev));
        }}
        onTakeLoan={() => {
          soundEngine.playExpense();
          setGameState((prev) => (prev ? takePersonalLoan(prev, 1) : prev));
        }}
      />

      {/* 勝利結算彈窗 */}
      {winner && (
        <div className="fixed inset-0 z-50 bg-[#1A2421]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="diorama-card max-w-md w-full rounded-3xl p-6 text-center space-y-4 animate-card-deal">
            <Trophy className="w-12 h-12 text-[#E8A849] mx-auto" />
            <h2 className="text-2xl font-black text-[#1E3B33]">
              恭喜 {winner.nickname} 達成財務自由！
            </h2>
            <p className="text-sm text-[#475550]">
              歷經 {gameState.turn} 回合，最終現金 {formatNtd(winner.cash)}，把日子過成了喜歡的樣子。
            </p>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setScreen('setup');
              }}
              className="diorama-btn-primary w-full py-3 rounded-xl font-bold cursor-pointer"
            >
              再來一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
