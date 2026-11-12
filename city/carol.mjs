// Public-domain melody rendered in the browser. Nothing in this file is a recording.
// "Jingle Bells" (originally "The One Horse Open Sleigh"), chorus, by James Lord
// Pierpont, published in 1857. Pierpont died in 1893, so the melody is in the
// public domain. The music-box timbre and the chord pad were written for this
// page; no sample or third-party arrangement is included. See MUSIC.md.
export const CAROL = {
  title: 'Jingle Bells',
  section: 'chorus',
  composer: 'James Lord Pierpont',
  published: 1857,
  composerDied: 1893,
  license: 'public-domain',
  summary: 'Synthesized chorus of the 1857 public-domain melody. No recording is shipped.',
  tempo: 100,
  sampleRate: 22050,
  peak: 0.22,
};
const Q = 1, H = 2, W = 4;
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67;
// Quarter-lengths. The chorus is 16 bars of 4/4: 64 quarters, and it ends on the tonic.
export const MELODY = [
  [E4, Q], [E4, Q], [E4, H],
  [E4, Q], [E4, Q], [E4, H],
  [E4, Q], [G4, Q], [C4, Q], [D4, Q],
  [E4, W],
  [F4, Q], [F4, Q], [F4, Q], [F4, Q],
  [F4, Q], [E4, Q], [E4, Q], [E4, Q],
  [E4, Q], [D4, Q], [D4, Q], [E4, Q],
  [D4, H], [G4, H],
  [E4, Q], [E4, Q], [E4, H],
  [E4, Q], [E4, Q], [E4, H],
  [E4, Q], [G4, Q], [C4, Q], [D4, Q],
  [E4, W],
  [F4, Q], [F4, Q], [F4, Q], [F4, Q],
  [F4, Q], [E4, Q], [E4, Q], [E4, Q],
  [G4, Q], [G4, Q], [F4, Q], [D4, Q],
  [C4, W],
];
// One chord per span, in quarter notes. Roots sit under the chorus and cadence on C.
export const ACCOMPANIMENT = [
  ['C', 4], ['C', 4], ['C', 3], ['G', 1], ['C', 4],
  ['F', 4], ['C', 2], ['G', 2], ['G', 4], ['G', 4],
  ['C', 4], ['C', 4], ['C', 3], ['G', 1], ['C', 4],
  ['F', 4], ['C', 2], ['G', 2], ['G', 4], ['C', 4],
];
export const CHORDS = {
  C: [48, 52, 55],
  F: [41, 45, 48],
  G: [43, 47, 50],
};
const TAU = Math.PI * 2;
export function midiHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}
function addSine(samples, rate, time, dur, freq, amp, attack, release) {
  const start = Math.floor(time * rate);
  const stop = Math.min(samples.length, Math.floor((time + dur + release) * rate));
  if (start >= stop) return;
  const attackN = Math.max(1, Math.floor(attack * rate));
  const releaseN = Math.max(1, Math.floor(release * rate));
  const holdEnd = Math.floor((time + dur) * rate);
  const step = TAU * freq / rate;
  let phase = 0;
  for (let i = start; i < stop; i++) {
    let env;
    if (i - start < attackN) env = (i - start) / attackN;
    else if (i < holdEnd) env = 1;
    else env = Math.max(0, 1 - (i - holdEnd) / releaseN);
    // A little decay through the hold keeps long notes from honking.
    const held = Math.exp(-Math.max(0, i - start - attackN) / (rate * (0.85 + dur)));
    samples[i] += amp * env * held * Math.sin(phase);
    phase += step;
    if (phase > TAU) phase -= TAU;
  }
}
function addBell(samples, rate, time, dur, midi) {
  const hz = midiHz(midi);
  // Bright attack, then a softer body, like a music box.
  addSine(samples, rate, time, dur * 0.92, hz, 0.16, 0.01, 0.2);
  addSine(samples, rate, time, dur * 0.92, hz * 1.003, 0.1, 0.01, 0.2);
  addSine(samples, rate, time, Math.min(dur, 0.18), hz * 2, 0.05, 0.006, 0.09);
  addSine(samples, rate, time, 0.045, hz * 3.4, 0.035, 0.003, 0.04);
}
function renderInto(samples, rate, tempo) {
  const quarter = 60 / tempo;
  let time = 0;
  for (const [midi, quarters] of MELODY) {
    addBell(samples, rate, time, quarters * quarter * 0.92, midi);
    time += quarters * quarter;
  }
  time = 0;
  for (const [name, quarters] of ACCOMPANIMENT) {
    const dur = quarters * quarter;
    for (const midi of CHORDS[name]) addSine(samples, rate, time, dur * 0.96, midiHz(midi), 0.03, 0.06, 0.16);
    time += dur;
  }
}
export function carolSeconds(tempo = CAROL.tempo) {
  const quarters = MELODY.reduce((sum, note) => sum + note[1], 0);
  return quarters * (60 / tempo) + 0.45;
}
// Mono loop. The written chorus ends on a long tonic, then a short rest, and both
// edges are faded to silence so AudioBufferSourceNode can loop without a click.
export function renderCarol({sampleRate = CAROL.sampleRate, tempo = CAROL.tempo, peak = CAROL.peak} = {}) {
  const length = Math.ceil(carolSeconds(tempo) * sampleRate);
  const samples = new Float32Array(length);
  renderInto(samples, sampleRate, tempo);
  const fadeIn = Math.floor(sampleRate * 0.012);
  const fadeOut = Math.floor(sampleRate * 0.08);
  for (let i = 0; i < fadeIn; i++) samples[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) samples[length - 1 - i] *= i / fadeOut;
  let loudest = 0;
  for (let i = 0; i < length; i++) {
    const level = Math.abs(samples[i]);
    if (level > loudest) loudest = level;
  }
  if (loudest > 0) {
    const gain = peak / loudest;
    for (let i = 0; i < length; i++) samples[i] *= gain;
  }
  return samples;
}
