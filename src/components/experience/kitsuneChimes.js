import { onSoundChange, soundOn } from '../soundSetting.js';

// The tails as wind chimes, from one recording cut in two (public/sounds): single strikes, and a
// loop of continuous chiming.
// - Strikes: two tails knocking together (the physics' impacts: how fast they closed at the
//   contact, so tails resting against each other stay quiet) ring a strike as loud as the knock,
//   each tail its own note (a pentatonic scale rising left to right across the fan), panned to its
//   place in the fan. The tail that closed faster rings louder; each pair and each tail waits a
//   moment before it can ring again, and only so many ring at once.
// - The bed: the loop swells with how much the tails are moving (their tips' speed) and falls
//   silent at rest, brightening as it swells.
// Only with sound on (soundSetting.js), once the page has been tapped or clicked (browsers hold
// sound until then), and as much as he's showing.
const STRIKES_URL = '/sounds/chime-strikes.mp3';
const BED_URL = '/sounds/chime-bed.mp3';
// Semitones from the recording's pitch, tails left to right.
const NOTES = [-5, -3, 0, 2, 4, 7];
// Closing speed (in tail lengths per second) where a knock starts to ring, and where it
// rings at full strength. Measured: tails at rest touch at up to ~0.003; a sweep of the mouse
// across them knocks them at ~0.02-0.13, up to ~0.35. So a slow sweep rings a few strikes, a
// brisk back-and-forth five or six a second, and a still fan none.
const STRIKE_MIN = 0.04;
const STRIKE_FULL = 0.3;
const STRIKE_GAIN = 0.55;
const PAIR_REST = 0.25;
const TAIL_REST = 0.12;
const VOICES = 6;
// Tip speed (tail lengths per second, summed over the tails) below which the bed is silent (at
// rest they sway at ~0.035) and that swells it fully (a brisk sweep reaches ~0.3-0.8); its level
// eases up over BED_RISE and down over BED_FALL (seconds).
const BED_QUIET = 0.06;
const BED_FULL = 0.8;
const BED_GAIN = 0.35;
const BED_RISE = 0.25;
const BED_FALL = 1.4;
const MASTER = 0.8;

// The strikes, one per stretch of sound between silences (the file keeps them apart with silence).
function splitStrikes(buffer) {
  const data = buffer.getChannelData(0);
  const quiet = Math.round(buffer.sampleRate * 0.03);
  const strikes = [];
  let start = -1;
  let silent = 0;
  for (let i = 0; i < data.length; i += 1) {
    if (Math.abs(data[i]) < 1e-4) {
      silent += 1;
      if (start >= 0 && silent >= quiet) {
        strikes.push({ at: start / buffer.sampleRate, length: (i - silent + 1 - start) / buffer.sampleRate });
        start = -1;
      }
    } else {
      if (start < 0) start = i;
      silent = 0;
    }
  }
  if (start >= 0) strikes.push({ at: start / buffer.sampleRate, length: (data.length - start) / buffer.sampleRate });
  return strikes.filter((strike) => strike.length > 0.05);
}

export function createChimes() {
  let context = null;
  let master = null;
  let strikesBuffer = null;
  let strikes = [];
  let bedGain = null;
  let bedFilter = null;
  let ready = false;
  let on = soundOn();
  let bedLevel = 0;
  let voices = 0;
  let lastStrike = -1;
  let played = 0;
  const pairRest = new Map();
  const tailRest = new Float64Array(NOTES.length);

  const start = () => {
    if (context) return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;
    // Safari: play as ambient sound, which the ringer switch silences.
    if (navigator.audioSession) navigator.audioSession.type = 'ambient';
    context = new AudioContextClass({ latencyHint: 'interactive' });
    master = context.createGain();
    master.gain.value = MASTER;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 8;
    master.connect(limiter).connect(context.destination);
    const load = (url) => fetch(url).then((response) => response.arrayBuffer()).then((data) => context.decodeAudioData(data));
    Promise.all([load(STRIKES_URL), load(BED_URL)]).then(([strikesAudio, bedAudio]) => {
      strikesBuffer = strikesAudio;
      strikes = splitStrikes(strikesAudio);
      const bed = context.createBufferSource();
      bed.buffer = bedAudio;
      bed.loop = true;
      bedFilter = context.createBiquadFilter();
      bedFilter.type = 'lowpass';
      bedFilter.frequency.value = 2500;
      bedGain = context.createGain();
      bedGain.gain.value = 0;
      bed.connect(bedFilter).connect(bedGain).connect(master);
      bed.start();
      ready = true;
    }).catch(() => {});
  };
  // Browsers only let sound start from a tap, click or key press.
  const unlock = () => {
    if (on) start();
    if (context?.state === 'suspended' && on && !document.hidden) context.resume();
  };
  const handleVisibility = () => {
    if (!context) return;
    if (document.hidden) context.suspend();
    else if (on) context.resume();
  };
  const stopListening = onSoundChange((next) => {
    on = next;
    if (on) unlock();
    else context?.suspend();
  });
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', handleVisibility);

  // One strike for `tail`, at `strength` (0 to 1).
  const strike = (tail, strength) => {
    const now = context.currentTime;
    if (voices >= VOICES || now < tailRest[tail] || !strikes.length) return;
    tailRest[tail] = now + TAIL_REST;
    // A different recording of a strike from the last, a hair off pitch, so repeats don't sound
    // mechanical.
    let pick = Math.floor(Math.random() * strikes.length);
    if (pick === lastStrike) pick = (pick + 1) % strikes.length;
    lastStrike = pick;
    const { at, length } = strikes[pick];
    const source = context.createBufferSource();
    source.buffer = strikesBuffer;
    source.playbackRate.value = 2 ** ((NOTES[tail] + (Math.random() - 0.5) * 0.2) / 12);
    const gain = context.createGain();
    gain.gain.value = STRIKE_GAIN * strength ** 1.6;
    const pan = context.createStereoPanner();
    pan.pan.value = (tail / (NOTES.length - 1) - 0.5) * 1.2;
    source.connect(gain).connect(pan).connect(master);
    voices += 1;
    played += 1;
    source.onended = () => { voices -= 1; };
    source.start(now, at, length);
  };

  // Each frame the scene draws him: `shown` is how far he's faded in (0 to 1).
  const update = (kitsune, shown, seconds) => {
    const { physics, tailLength } = kitsune;
    const live = ready && on && context.state === 'running' && shown > 0;
    const now = context?.currentTime ?? 0;
    physics.takeImpacts((i, j, speed) => {
      if (!live) return;
      const strength = Math.min(Math.max((speed / tailLength - STRIKE_MIN) / (STRIKE_FULL - STRIKE_MIN), 0), 1);
      const pair = i * NOTES.length + j;
      if (strength <= 0 || now < (pairRest.get(pair) ?? 0)) return;
      pairRest.set(pair, now + PAIR_REST);
      // The faster-moving of the two rings louder.
      const tipSpeed = (index) => {
        const { points, previous } = physics.chains[index];
        return points[points.length - 1].distanceTo(previous[points.length - 1]);
      };
      const [loud, soft] = tipSpeed(i) >= tipSpeed(j) ? [i, j] : [j, i];
      strike(loud, strength * shown);
      strike(soft, strength * 0.5 * shown);
    });
    if (!ready || !bedGain) return;
    let motion = 0;
    physics.chains.forEach(({ points, previous }) => {
      motion += points[points.length - 1].distanceTo(previous[points.length - 1]) * 120;
    });
    motion /= tailLength;
    const target = live ? Math.min(Math.max((motion - BED_QUIET) / (BED_FULL - BED_QUIET), 0), 1) ** 0.8 * shown : 0;
    const ease = target > bedLevel ? BED_RISE : BED_FALL;
    bedLevel += (target - bedLevel) * Math.min(seconds / ease, 1);
    bedGain.gain.setTargetAtTime(bedLevel * BED_GAIN, now, 0.05);
    bedFilter.frequency.setTargetAtTime(2500 + 9000 * bedLevel, now, 0.1);
  };

  const dispose = () => {
    stopListening();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    document.removeEventListener('visibilitychange', handleVisibility);
    context?.close();
  };

  return {
    update,
    dispose,
    // For checking in development: whether it's running, and what it's played.
    state: () => ({ context: context?.state ?? 'none', ready, strikes: strikes.length, played, bed: +bedLevel.toFixed(3) }),
  };
}
