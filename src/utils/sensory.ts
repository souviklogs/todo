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
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    if (osc1.frequency?.setValueAtTime) {
      osc1.frequency.setValueAtTime(ROOT_CHIME_FREQUENCY, now);
    }
    if (gain1.gain?.setValueAtTime) {
      gain1.gain.setValueAtTime(0.2, now);
    }
    if (gain1.gain?.exponentialRampToValueAtTime) {
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    }
    osc1.connect?.(gain1);
    gain1.connect?.(ctx.destination);
    osc1.start?.(now);
    osc1.stop?.(now + 0.25);

    // Tone 2: Octave chime (D6) - delayed cheerful octave ring
    const tone2Start = now + 0.1;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    if (osc2.frequency?.setValueAtTime) {
      osc2.frequency.setValueAtTime(OCTAVE_CHIME_FREQUENCY, tone2Start);
    }
    if (gain2.gain?.setValueAtTime) {
      gain2.gain.setValueAtTime(0.25, tone2Start);
    }
    if (gain2.gain?.exponentialRampToValueAtTime) {
      gain2.gain.exponentialRampToValueAtTime(0.0001, tone2Start + 0.35);
    }
    osc2.connect?.(gain2);
    gain2.connect?.(ctx.destination);
    osc2.start?.(tone2Start);
    osc2.stop?.(tone2Start + 0.35);
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
