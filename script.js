const pads = document.querySelectorAll(".drum-pad");
const volumeSlider = document.getElementById("volume");
const volumeValue = document.getElementById("volumeValue");
const muteButton = document.getElementById("muteButton");
const statusText = document.getElementById("statusText");

let audioContext;
let masterGain;
let isMuted = false;
let volume = Number(volumeSlider.value) / 100;

function initializeAudio() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      statusText.textContent = "AUDIO NOT SUPPORTED";
      return false;
    }

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return true;
}

function createOscillator(type, frequency, endFrequency, duration, gain = 1) {
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      now + duration
    );
  }

  envelope.gain.setValueAtTime(gain, now);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(envelope);
  envelope.connect(masterGain);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

function createNoise(duration, frequency, gain = 1) {
  const bufferSize = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(
    1,
    bufferSize,
    audioContext.sampleRate
  );

  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const envelope = audioContext.createGain();
  const now = audioContext.currentTime;

  noise.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = frequency;

  envelope.gain.setValueAtTime(gain, now);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter);
  filter.connect(envelope);
  envelope.connect(masterGain);

  noise.start(now);
  noise.stop(now + duration);
}

const sounds = {
  kick() {
    createOscillator("sine", 150, 42, 0.45, 1.2);
  },

  snare() {
    createNoise(0.2, 900, 0.65);
    createOscillator("triangle", 190, 80, 0.12, 0.45);
  },

  hihat() {
    createNoise(0.09, 7000, 0.35);
  },

  tom() {
    createOscillator("sine", 180, 65, 0.35, 0.9);
  },

  cymbal() {
    createNoise(1.1, 4500, 0.5);
  },

  clap() {
    createNoise(0.12, 1200, 0.55);
    setTimeout(() => {
      if (audioContext && masterGain) {
        createNoise(0.1, 1500, 0.4);
      }
    }, 55);
  },

  rim() {
    createOscillator("square", 700, 180, 0.07, 0.35);
  },

  openhat() {
    createNoise(0.55, 5000, 0.4);
  }
};

function playSound(soundName, pad) {
  if (!initializeAudio()) return;

  const sound = sounds[soundName];

  if (!sound) return;

  if (isMuted) {
    statusText.textContent = "MUTED";
    return;
  }

  sound();

  if (pad) {
    pad.classList.add("playing");
    window.setTimeout(() => {
      pad.classList.remove("playing");
    }, 130);
  }

  statusText.textContent = `PLAYING ${soundName.toUpperCase()}`;
}

pads.forEach((pad) => {
  pad.addEventListener("click", () => {
    playSound(pad.dataset.sound, pad);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.repeat) return;

  const key = event.key.toLowerCase();

  const pad = document.querySelector(
    `.drum-pad[data-key="${key}"]`
  );

  if (pad) {
    playSound(pad.dataset.sound, pad);
  }
});

volumeSlider.addEventListener("input", () => {
  volume = Number(volumeSlider.value) / 100;
  volumeValue.textContent = `${volumeSlider.value}%`;

  if (masterGain && !isMuted) {
    masterGain.gain.setTargetAtTime(
      volume,
      audioContext.currentTime,
      0.02
    );
  }
});

muteButton.addEventListener("click", () => {
  isMuted = !isMuted;

  muteButton.textContent = isMuted ? "UNMUTE" : "MUTE";
  statusText.textContent = isMuted ? "MUTED" : "READY TO PLAY";

  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(
      isMuted ? 0 : volume,
      audioContext.currentTime,
      0.02
    );
  }
});
