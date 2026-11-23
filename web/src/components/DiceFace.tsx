interface DiceFaceProps {
  value: number;
  rolling?: boolean;
}

const PIP_LAYOUTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function DiceFace({ value, rolling = false }: DiceFaceProps) {
  const safeVal = Math.min(6, Math.max(1, value));
  const pips = PIP_LAYOUTS[safeVal] ?? [4];
  const isRed = safeVal === 1 || safeVal === 4;

  return (
    <div
      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#FFFDF8] to-[#EDE2CC] border-2 border-[#D4C3A3] shadow-[0_3px_0_#C2AF8C,0_6px_12px_rgba(0,0,0,0.2)] p-1.5 grid grid-cols-3 grid-rows-3 gap-0.5 items-center justify-items-center ${
        rolling ? 'animate-dice-tumble' : ''
      }`}
      aria-label={`骰子 ${safeVal} 點`}
    >
      {Array.from({ length: 9 }).map((_, idx) => {
        const active = pips.includes(idx);
        return (
          <span
            key={idx}
            className={`rounded-full transition-opacity ${
              active
                ? `${safeVal === 1 ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'} ${
                    isRed ? 'bg-[#C84232]' : 'bg-[#262A2C]'
                  } opacity-100 shadow-inner`
                : 'w-1.5 h-1.5 opacity-0'
            }`}
          />
        );
      })}
    </div>
  );
}
