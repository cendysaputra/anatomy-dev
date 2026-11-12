// Plays the synthesized carol. Browsers refuse audio until a gesture, so the
// toggle starts and stops it, and the first drag or key press starts it too
// when the listener has left the music on. The mute choice is remembered here.
import {CAROL, renderCarol} from './carol.mjs';

export const STORAGE_KEY = 'city-music';
// The buffer is already normalised to a modest peak. This gain keeps it in the background.
export const LEVEL = 0.6;

// No saved choice follows the device: reduced motion stays quiet until the toggle is used.
export function wantsMusic(stored, reducedMotion) {
  if (stored === 'on') return true;
  if (stored === 'off') return false;
  return !reducedMotion;
}

// The toggle's own click handles that gesture. Map drags and keys only step in
// while music is wanted and not already running.
export function gestureStartsMusic(enabled, alreadyGoing, fromToggle) {
  return !!enabled && !alreadyGoing && !fromToggle;
}

export function shouldSuspend(enabled, hidden) {
  return !enabled || !!hidden;
}

export function attachCityMusic(button) {
  if (!button || typeof window === 'undefined') return null;
  let stored = null;
  try { stored = window.localStorage.getItem(STORAGE_KEY); } catch {}
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let enabled = wantsMusic(stored, reduced);
  let ctx = null, gain = null, source = null, pcm = null, hushToken = 0, arming = false;

  function paint() {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Bisukan musik Natal' : 'Putar musik Natal');
  }
  function samples() {
    return pcm ??= renderCarol();
  }
  function remember() {
    try { window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch {}
  }
  function start() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    hushToken++;
    try {
      if (!ctx) {
        ctx = new AudioCtx();
        gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(ctx.destination);
      }
      if (!source) {
        const data = samples();
        const buffer = ctx.createBuffer(1, data.length, CAROL.sampleRate);
        buffer.getChannelData(0).set(data);
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        source.start();
      }
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(LEVEL, now, 0.12);
      ctx.resume()?.catch(() => { arming = false; });
      arming = true;
      return true;
    } catch {
      arming = false;
      return false;
    }
  }
  function hush() {
    if (!ctx || !gain) return;
    const now = ctx.currentTime;
    const token = ++hushToken;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.04);
    window.setTimeout(() => {
      if (token !== hushToken || !ctx) return;
      if (shouldSuspend(enabled, document.hidden)) ctx.suspend()?.catch(() => {});
    }, 140);
  }
  function arm(event) {
    const going = arming || ctx?.state === 'running';
    if (!gestureStartsMusic(enabled, going, button.contains(event.target))) return;
    start();
  }

  button.addEventListener('click', () => {
    enabled = !enabled;
    remember();
    paint();
    if (enabled) start();
    else { arming = false; hush(); }
  });
  window.addEventListener('pointerdown', arm, true);
  window.addEventListener('keydown', arm, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (shouldSuspend(enabled, document.hidden)) hush();
    else start();
  });
  const idle = window.requestIdleCallback ?? (fn => window.setTimeout(fn, 250));
  if (enabled) idle(() => samples());
  paint();
  return {get enabled() { return enabled; }};
}
