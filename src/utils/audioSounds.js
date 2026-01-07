/**
 * Audio-Sounds für Lektionsende
 * Verwendet Web Audio API zum Generieren angenehmer Töne
 */

// AudioContext singleton
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Verfügbare Töne mit Beschreibungen
export const SOUND_OPTIONS = [
  { value: 'chime', label: 'Windspiel', description: 'Harmonisch & freundlich' },
  { value: 'bell', label: 'Sanfte Glocke', description: 'Dezent & entspannend' },
  { value: 'schoolbell', label: 'Schulglocke', description: 'Klassisch & traditionell' },
  { value: 'ping', label: 'Digitaler Ping', description: 'Modern & kurz' },
  { value: 'xylophone', label: 'Xylophon', description: 'Hell & fröhlich' },
];

/**
 * Spielt einen Ton basierend auf dem ausgewählten Sound-Typ
 * @param {string} soundType - Der Ton-Typ (chime, bell, schoolbell, ping, xylophone)
 * @param {number} volume - Lautstärke (0-1)
 */
export function playSound(soundType, volume = 0.5) {
  const ctx = getAudioContext();

  // AudioContext muss nach User-Interaktion resumed werden
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);

  switch (soundType) {
    case 'chime':
      playChime(ctx, masterGain);
      break;
    case 'bell':
      playBell(ctx, masterGain);
      break;
    case 'schoolbell':
      playSchoolbell(ctx, masterGain);
      break;
    case 'ping':
      playPing(ctx, masterGain);
      break;
    case 'xylophone':
      playXylophone(ctx, masterGain);
      break;
    default:
      playChime(ctx, masterGain);
  }
}

// Windspiel - harmonische Akkordtöne
function playChime(ctx, masterGain) {
  const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const startTime = ctx.currentTime;

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, startTime + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.3, startTime + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.1 + 1.5);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime + i * 0.1);
    osc.stop(startTime + i * 0.1 + 1.5);
  });
}

// Sanfte Glocke - einzelner warmer Ton mit Obertönen
function playBell(ctx, masterGain) {
  const startTime = ctx.currentTime;
  const baseFreq = 440; // A4

  // Grundton
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = baseFreq;
  gain1.gain.setValueAtTime(0.4, startTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 2);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(startTime);
  osc1.stop(startTime + 2);

  // Oberton 1
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = baseFreq * 2;
  gain2.gain.setValueAtTime(0.2, startTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(startTime);
  osc2.stop(startTime + 1.5);

  // Oberton 2
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.value = baseFreq * 3;
  gain3.gain.setValueAtTime(0.1, startTime);
  gain3.gain.exponentialRampToValueAtTime(0.001, startTime + 1);
  osc3.connect(gain3);
  gain3.connect(masterGain);
  osc3.start(startTime);
  osc3.stop(startTime + 1);
}

// Klassische Schulglocke - zwei schnelle Töne
function playSchoolbell(ctx, masterGain) {
  const startTime = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 880; // A5

    const ringStart = startTime + i * 0.3;
    gain.gain.setValueAtTime(0, ringStart);
    gain.gain.linearRampToValueAtTime(0.5, ringStart + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ringStart + 0.25);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ringStart);
    osc.stop(ringStart + 0.25);
  }
}

// Digitaler Ping - kurzer moderner Benachrichtigungston
function playPing(ctx, masterGain) {
  const startTime = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, startTime);
  osc.frequency.exponentialRampToValueAtTime(800, startTime + 0.1);

  gain.gain.setValueAtTime(0.4, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(startTime);
  osc.stop(startTime + 0.3);
}

// Xylophon - helle, fröhliche aufsteigende Töne
function playXylophone(ctx, masterGain) {
  const notes = [523.25, 587.33, 659.25, 783.99]; // C5, D5, E5, G5
  const startTime = ctx.currentTime;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Xylophon hat einen charakteristischen Attack
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const noteStart = startTime + i * 0.12;
    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.4, noteStart + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(noteStart);
    osc.stop(noteStart + 0.4);
  });
}

/**
 * Vorschau eines Tons abspielen (für UI)
 */
export function previewSound(soundType, volume = 0.5) {
  playSound(soundType, volume);
}
