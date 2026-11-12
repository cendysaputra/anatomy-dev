import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAROL, MELODY, ACCOMPANIMENT, CHORDS, renderCarol, carolSeconds} from './carol.mjs';
import {STORAGE_KEY, LEVEL, wantsMusic, gestureStartsMusic, shouldSuspend} from './music.mjs';

const text = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const DIATONIC = new Set([0, 2, 4, 5, 7, 9, 11]);

test('the carol is the public-domain Jingle Bells chorus and no recording is shipped', () => {
  assert.equal(CAROL.title, 'Jingle Bells');
  assert.equal(CAROL.section, 'chorus');
  assert.equal(CAROL.composer, 'James Lord Pierpont');
  assert.equal(CAROL.published, 1857);
  assert.equal(CAROL.license, 'public-domain');
  assert.ok(CAROL.composerDied <= 1928);
  assert.match(CAROL.summary, /no recording/i);
  const note = text('MUSIC.md');
  assert.match(note, /public domain/i);
  assert.match(note, /James Lord Pierpont/);
  assert.match(note, /1857/);
  assert.match(note, /No audio file/);
});

test('the chorus is 64 diatonic quarters and cadences on the tonic', () => {
  assert.equal(MELODY.reduce((sum, note) => sum + note[1], 0), 64);
  assert.equal(ACCOMPANIMENT.reduce((sum, bar) => sum + bar[1], 0), 64);
  assert.deepEqual(MELODY[0], [64, 1]);
  assert.deepEqual(MELODY.at(-1), [60, 4]);
  for (const [midi, quarters] of MELODY) {
    assert.ok(quarters > 0);
    assert.ok(DIATONIC.has(midi % 12), midi);
  }
  for (const [name, quarters] of ACCOMPANIMENT) {
    assert.ok(quarters > 0);
    assert.ok(CHORDS[name]);
    for (const midi of CHORDS[name]) assert.ok(DIATONIC.has(midi % 12));
  }
  assert.ok(Math.abs(carolSeconds() - 38.85) < 1e-9);
});

test('the rendered loop is finite, modest, deterministic, and silent at the seam', () => {
  const first = renderCarol();
  const second = renderCarol();
  assert.equal(first.length, Math.ceil(carolSeconds() * CAROL.sampleRate));
  assert.equal(second.length, first.length);
  assert.equal(first[8000], second[8000]);
  assert.equal(first[first.length >> 1], second[second.length >> 1]);
  let peak = 0, energy = 0;
  for (let i = 0; i < first.length; i++) {
    assert.ok(Number.isFinite(first[i]));
    peak = Math.max(peak, Math.abs(first[i]));
    energy += first[i] * first[i];
  }
  assert.ok(peak > 0.15 && peak <= CAROL.peak + 1e-4);
  assert.ok(Math.sqrt(energy / first.length) > 0.02);
  const rate = CAROL.sampleRate;
  const rms = (from, to) => {
    let sum = 0;
    for (let i = from; i < to; i++) sum += first[i] * first[i];
    return Math.sqrt(sum / (to - from));
  };
  assert.equal(first[0], 0);
  assert.ok(Math.abs(first.at(-1)) < 1e-5);
  assert.ok(rms(0, Math.floor(rate * 0.4)) > 0.01);
  assert.ok(rms(first.length - Math.floor(rate * 0.2), first.length) < 0.001);
});

test('mute follows the saved choice and reduced motion, and only a real gesture starts audio', () => {
  assert.equal(wantsMusic(null, false), true);
  assert.equal(wantsMusic(null, true), false);
  assert.equal(wantsMusic('off', false), false);
  assert.equal(wantsMusic('on', true), true);
  assert.equal(wantsMusic('nope', false), true);
  assert.equal(gestureStartsMusic(true, false, false), true);
  assert.equal(gestureStartsMusic(true, false, true), false);
  assert.equal(gestureStartsMusic(true, true, false), false);
  assert.equal(gestureStartsMusic(false, false, false), false);
  assert.equal(shouldSuspend(true, false), false);
  assert.equal(shouldSuspend(true, true), true);
  assert.equal(shouldSuspend(false, false), true);
  assert.equal(STORAGE_KEY, 'city-music');
  assert.ok(LEVEL > 0 && LEVEL <= 0.7);
});

test('the page exposes a labelled music button that the build keeps', () => {
  const html = text('index.html');
  assert.match(html, /<button class="music-toggle" type="button" aria-pressed="false" aria-label="Putar musik Natal">/);
  assert.match(html, /class="icon-off"/);
  assert.match(html, /class="icon-on"/);
  assert.match(text('build.mjs'), /class="music-toggle"/);
  assert.match(text('style.css'), /\.music-toggle\[aria-pressed="true"\]/);
});
