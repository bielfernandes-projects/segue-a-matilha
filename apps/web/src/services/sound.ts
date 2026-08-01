// Web Audio API Sound Synthesizer for Segue a Matilha

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function blip(freqStart: number, freqEnd: number, duration: number, volume: number, type: OscillatorType): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playClickSound() {
  if (!soundEnabled) return;
  blip(600, 300, 0.05, 0.15, 'sine');
}

export function playWoofSound() {
  if (!soundEnabled) return;
  blip(220, 110, 0.18, 0.3, 'sawtooth');
}

export function playRevealChime() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [440, 554.37, 659.25, 880]; // A major chord
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + idx * 0.08);
    osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
  });
}

export function playVictoryFanfare() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, C
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + idx * 0.12);
    osc.stop(ctx.currentTime + idx * 0.12 + 0.6);
  });
}

export function playTickSound() {
  if (!soundEnabled) return;
  blip(800, 800, 0.03, 0.08, 'sine');
}
