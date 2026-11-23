import { useEffect, useState } from 'react';
import { ArrowRight, Compass, FastForward, RotateCcw, ShieldCheck } from 'lucide-react';
import { soundEngine } from '../services/sound';

interface SplashScreenProps {
  onStart: () => void;
}

type IntroPhase = 'opening' | 'quote' | 'title' | 'ready';

const DUST_PARTICLES = [
  { left: '14%', top: '68%', delay: '0.2s', size: 6 },
  { left: '26%', top: '52%', delay: '1.1s', size: 4 },
  { left: '38%', top: '74%', delay: '0.6s', size: 7 },
  { left: '54%', top: '60%', delay: '1.7s', size: 5 },
  { left: '67%', top: '70%', delay: '0.4s', size: 6 },
  { left: '78%', top: '55%', delay: '1.4s', size: 5 },
  { left: '86%', top: '66%', delay: '0.9s', size: 4 },
];

export function SplashScreen({ onStart }: SplashScreenProps) {
  const [phase, setPhase] = useState<IntroPhase>('opening');
  const [animRunId, setAnimRunId] = useState(0);

  useEffect(() => {
    setPhase('opening');
    const t1 = window.setTimeout(() => setPhase('quote'), 900);
    const t2 = window.setTimeout(() => setPhase('title'), 2600);
    const t3 = window.setTimeout(() => setPhase('ready'), 3800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [animRunId]);

  const handleSkip = () => {
    soundEngine.playClick();
    setPhase('ready');
  };

  const handleReplay = () => {
    soundEngine.playMilestone();
    setAnimRunId((n) => n + 1);
  };

  const showTitle = phase === 'title' || phase === 'ready';
  const isReady = phase === 'ready';

  return (
    <div
      key={animRunId}
      className="relative min-h-screen w-full overflow-hidden bg-[#F7F1E3] flex flex-col"
    >
      <div className="relative flex-1 flex flex-col items-center justify-between px-6 py-8 md:py-12">
        {/* 微縮模型主視覺 + 電影感緩慢推鏡 */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-intro-camera"
          style={{
            backgroundImage: "url('./assets/art/key_visual.jpg')",
            backgroundPosition: 'center 62%',
          }}
        />

        {/* 斜射暖金陽光掃過層 */}
        <div
          className="absolute inset-y-0 left-0 w-2/3 pointer-events-none animate-sunbeam"
          style={{
            background:
              'linear-gradient(105deg, transparent 15%, rgba(255, 243, 209, 0.55) 48%, rgba(232, 168, 73, 0.22) 65%, transparent 88%)',
          }}
        />

        {/* 暖紙頂部漸層與底部暗角 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7F1E3] via-[#F7F1E3]/65 to-transparent pointer-events-none" />
        <div
          className={`absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#1E3B33]/88 via-[#1E3B33]/45 to-transparent pointer-events-none transition-opacity duration-700 ${
            isReady ? 'opacity-100' : 'opacity-60'
          }`}
        />

        {/* 飄浮暖金光塵粒子 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {DUST_PARTICLES.map((p, idx) => (
            <span
              key={idx}
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
              }}
              className="absolute rounded-full bg-[#FFF3D1] shadow-[0_0_8px_#E8A849] animate-dust"
            />
          ))}
        </div>

        {/* 頂部敘事字幕與品牌主標 */}
        <header className="relative z-10 text-center max-w-2xl mx-auto mt-2 md:mt-6 min-h-[170px] flex flex-col items-center justify-center">
          {phase === 'opening' && (
            <div className="animate-intro-fade-up text-xs md:text-sm font-bold tracking-[0.28em] text-[#245E50]/85">
              TAIWAN LIFE &amp; FINANCE DIORAMA
            </div>
          )}

          {phase === 'quote' && (
            <div className="space-y-2.5 animate-intro-fade-up">
              <p className="text-lg md:text-2xl font-black text-[#1E3B33] tracking-wider">
                每一份薪水，都是夢想的起點
              </p>
              <p className="text-xs md:text-base font-medium text-[#475550] tracking-widest">
                從小鎮紅磚街角出發，走向東岸蔚藍海灣
              </p>
            </div>
          )}

          {showTitle && (
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#245E50]/10 border border-[#245E50]/25 text-[#245E50] text-xs font-bold tracking-wider mb-3.5 animate-intro-fade-up">
                <Compass className="w-3.5 h-3.5" />
                <span>台灣理財生活桌遊 · 等角微縮重製版 v1.0</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-[#1E3B33] drop-shadow-sm animate-title-stamp">
                從薪開始
              </h1>

              <div className="w-28 h-0.5 my-3 bg-gradient-to-r from-transparent via-[#E8A849] to-transparent animate-line-expand" />

              <p className="text-base md:text-xl font-medium text-[#475550] tracking-widest animate-intro-fade-up">
                把日子過成喜歡的樣子
              </p>
            </div>
          )}
        </header>

        {/* 底部操作按鈕列（動畫完成後優雅升起；播放中提供略過按鈕） */}
        <footer className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center gap-3 pb-2 min-h-[100px] justify-end">
          {!isReady ? (
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E3B33]/75 hover:bg-[#1E3B33] text-[#FFFDF8] text-xs font-bold tracking-wider backdrop-blur-sm border border-white/20 transition-colors cursor-pointer"
            >
              <span>略過開頭動畫</span>
              <FastForward className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-full space-y-3 animate-intro-fade-up">
              <button
                type="button"
                onClick={onStart}
                className="diorama-btn-primary w-full py-4 px-8 rounded-2xl text-lg font-bold flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>展開新的人生旅程</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between w-full px-2 text-xs text-[#F7F1E3]/90">
                <button
                  type="button"
                  onClick={handleReplay}
                  className="inline-flex items-center gap-1 hover:text-[#E8A849] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重播開頭動畫</span>
                </button>
                <a
                  href="./admin/index.html"
                  className="inline-flex items-center gap-1 hover:text-[#E8A849] transition-colors underline underline-offset-4"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>遊玩紀錄後台</span>
                </a>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
