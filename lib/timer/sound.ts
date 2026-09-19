// Synthesizes the rest-timer alert tone with the Web Audio API rather than
// shipping an audio file - works offline, adds no bundle weight, and avoids
// needing rights to any actual sound recording.

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

function beep(ctx: AudioContext, atTime: number, freq: number, durationSec: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  // Quick fade in/out avoids an audible click at the start/end of each beep.
  gain.gain.setValueAtTime(0, atTime);
  gain.gain.linearRampToValueAtTime(0.35, atTime + 0.02);
  gain.gain.linearRampToValueAtTime(0.35, atTime + durationSec - 0.03);
  gain.gain.linearRampToValueAtTime(0, atTime + durationSec);

  osc.start(atTime);
  osc.stop(atTime + durationSec);
}

/** Three ascending beeps - the "rest's over" alert. */
export function playCompletionSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  beep(ctx, now, 660, 0.16);
  beep(ctx, now + 0.22, 660, 0.16);
  beep(ctx, now + 0.44, 880, 0.28);
}

export function vibrateIfSupported(pattern: number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

// ---------------------------------------------------------------------------
// Keep-alive loop: a near-silent looping tone played only while a timer is
// running. This is the same mechanism music/podcast apps use to stop mobile
// browsers from fully suspending a backgrounded tab's JavaScript - active
// audio playback is one of the few signals browsers respect for that. It's
// best-effort, not a guarantee (and iOS is stricter about it than Android),
// but it meaningfully improves the odds the alert fires close to on time.
// ---------------------------------------------------------------------------

let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;

export function startKeepAlive() {
  const ctx = getAudioContext();
  if (!ctx || keepAliveOsc) return;
  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 40; // low frequency, effectively inaudible
  gain.gain.value = 0.001; // near-silent, but technically "playing audio"
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();

  keepAliveOsc = osc;
  keepAliveGain = gain;
}

export function stopKeepAlive() {
  keepAliveOsc?.stop();
  keepAliveOsc?.disconnect();
  keepAliveGain?.disconnect();
  keepAliveOsc = null;
  keepAliveGain = null;
}
