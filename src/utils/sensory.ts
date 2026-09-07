let cachedAudioContext: AudioContext | null = null;
let lastAudioContextClass: unknown = null;

export const ROOT_CHIME_FREQUENCY = 587.33; // D5
export const OCTAVE_CHIME_FREQUENCY = ROOT_CHIME_FREQUENCY * 2; // 1174.66 Hz (D6)
export const HAPTIC_FEEDBACK_PATTERN = [15, 30, 15];

/**
 * Returns a shared Web Audio API AudioContext instance, or null if unsupported.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return null;

  // If constructor changed (e.g. between tests) or previous context closed, recreate
  if (lastAudioContextClass !== AudioContextClass || cachedAudioContext?.state === 'closed') {
    cachedAudioContext = null;
    lastAudioContextClass = AudioContextClass;
  }

  if (!cachedAudioContext) {
    try {
      cachedAudioContext = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (cachedAudioContext && cachedAudioContext.state === 'suspended') {
    try {
      cachedAudioContext.resume?.().catch?.(() => {});
    } catch {}
  }

  return cachedAudioContext;
}

/**
 * Resets the cached AudioContext instance (useful for testing).
 */
export function resetAudioContext(): void {
  cachedAudioContext = null;
  lastAudioContextClass = null;
}

/**
 * Schedules a single sine tone on the AudioContext with an exponential decay envelope.
 */
function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  peakGain: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  if (osc.frequency?.setValueAtTime) {
    osc.frequency.setValueAtTime(frequency, startTime);
  }
  if (gain.gain?.setValueAtTime) {
    gain.gain.setValueAtTime(peakGain, startTime);
  }
  if (gain.gain?.exponentialRampToValueAtTime) {
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  }
  osc.connect?.(gain);
  gain.connect?.(ctx.destination);
  osc.start?.(startTime);
  osc.stop?.(startTime + duration);
}

/**
 * Synthesizes a signature two-tone Microsoft To Do-style completion chime
 * (root to octave chime with sine oscillator and exponential gain decay)
 * using the Web Audio API AudioContext without external audio files.
 */
export function playCompletionChime(customAudioContext?: AudioContext | null): void {
  try {
    const ctx = customAudioContext ?? getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        ctx.resume?.().catch?.(() => {});
      } catch {}
    }

    const now = ctx.currentTime || 0;

    // Tone 1: Root chime (D5)
    playTone(ctx, ROOT_CHIME_FREQUENCY, now, 0.25, 0.2);

    // Tone 2: Octave chime (D6) - delayed cheerful octave ring
    playTone(ctx, OCTAVE_CHIME_FREQUENCY, now + 0.1, 0.35, 0.25);
  } catch (err) {
    console.warn('Unable to play completion chime:', err);
  }
}

/**
 * Triggers subtle mobile vibration feedback ('navigator.vibrate')
 * using the signature [15, 30, 15] millisecond pattern.
 */
export function triggerHapticFeedback(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(HAPTIC_FEEDBACK_PATTERN);
    }
  } catch (err) {
    console.warn('Unable to trigger mobile haptic feedback:', err);
  }
}

/**
 * Triggers sensory feedback for task/subtask completion.
 */
export function triggerCompletionSensory(options?: {
  soundEnabled?: boolean;
  audioContext?: AudioContext | null;
}): void {
  if (options?.soundEnabled !== false) {
    playCompletionChime(options?.audioContext);
  }
  triggerHapticFeedback();
}
