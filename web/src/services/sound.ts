/**
 * 純 Web Audio API 溫潤木質桌遊音效引擎
 * 零外部音檔載入延遲，支援點擊自動解鎖與靜音切換
 */

class TabletopSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.playClick();
    }
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    startOffset = 0,
    endFreq?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** 清脆木質按鈕點擊聲 */
  public playClick() {
    this.playTone(540, 0.055, 'triangle', 0.1, 0, 320);
  }

  /** 實體骰子滾動喀啦聲（多段木塊敲擊） */
  public playDiceRoll() {
    const hits = [0, 0.06, 0.13, 0.21, 0.3, 0.38];
    const freqs = [320, 460, 390, 520, 410, 580];
    hits.forEach((offset, i) => {
      this.playTone(freqs[i], 0.045, 'triangle', 0.11 - i * 0.01, offset, freqs[i] * 0.65);
    });
  }

  /** 棋子落點輕彈聲 */
  public playStep() {
    this.playTone(380, 0.08, 'sine', 0.11, 0, 560);
  }

  /** 發薪日／現金入帳清脆銅板和弦 */
  public playPayday() {
    this.playTone(523.25, 0.16, 'triangle', 0.13, 0); // C5
    this.playTone(659.25, 0.18, 'triangle', 0.13, 0.08); // E5
    this.playTone(783.99, 0.22, 'sine', 0.15, 0.16); // G5
    this.playTone(1046.5, 0.34, 'sine', 0.14, 0.24); // C6
  }

  /** 買入資產／成交叮噹聲 */
  public playPurchase() {
    this.playTone(587.33, 0.12, 'triangle', 0.12, 0); // D5
    this.playTone(880, 0.26, 'sine', 0.14, 0.09); // A5
  }

  /** 賣出變現／還清負債清爽上升音 */
  public playSell() {
    this.playTone(440, 0.1, 'sine', 0.11, 0);
    this.playTone(554.37, 0.12, 'sine', 0.12, 0.07);
    this.playTone(659.25, 0.22, 'triangle', 0.13, 0.14);
  }

  /** 額外支出／風險警示低沉木魚音 */
  public playExpense() {
    this.playTone(260, 0.14, 'triangle', 0.13, 0, 190);
    this.playTone(185, 0.24, 'sine', 0.12, 0.11, 130);
  }

  /** 里程碑／晉升東岸夢想圈／勝利慶祝琶音 */
  public playMilestone() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.32, 'triangle', 0.14, idx * 0.085);
    });
  }
}

export const soundEngine = new TabletopSoundEngine();
