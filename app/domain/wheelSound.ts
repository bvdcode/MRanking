export type WheelSoundOptions = {
  enabled?: boolean;
  volume?: number;
};

type SafariWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class WheelSoundEngine {
  private context: AudioContext | null = null;
  private enabled: boolean;
  private volume: number;
  private lastTickAt = 0;
  private spinSource: AudioBufferSourceNode | null = null;
  private spinGain: GainNode | null = null;
  private spinFilter: BiquadFilterNode | null = null;
  private spinSpeed = 0;

  constructor(options: WheelSoundOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.volume = this.clampVolume(options.volume ?? 0.55);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopSpin(40);
    }
  }

  setVolume(volume: number) {
    this.volume = this.clampVolume(volume);
    if (this.spinGain && this.context) {
      this.spinGain.gain.setTargetAtTime(
        this.spinGainForSpeed(this.spinSpeed),
        this.context.currentTime,
        0.03,
      );
    }
  }

  async resume() {
    const context = this.getContext();
    if (context?.state === "suspended") {
      await context.resume();
    }
  }

  tick(intensity = 0.5) {
    if (!this.enabled) {
      return;
    }
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    if (now - this.lastTickAt < 18) {
      return;
    }
    this.lastTickAt = now;
    const context = this.getContext();
    if (!context) {
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const strength = Math.min(1, Math.max(0.1, intensity));
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1_050 + strength * 420, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(520, context.currentTime + 0.026);
    gain.gain.setValueAtTime(Math.max(0.0001, this.volume * 0.09 * strength), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.032);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.035);
  }

  startSpin() {
    if (!this.enabled || this.spinSource) {
      return;
    }
    const context = this.getContext();
    if (!context) {
      return;
    }
    const frameCount = Math.max(1, Math.floor(context.sampleRate * 0.35));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.93 + white * 0.07;
      samples[index] = previous;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "bandpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      this.spinGainForSpeed(0),
      context.currentTime + 0.09,
    );
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    this.spinSource = source;
    this.spinFilter = filter;
    this.spinGain = gain;
  }

  setSpinSpeed(speed: number) {
    if (!this.context || !this.spinSource || !this.spinFilter || !this.spinGain) {
      return;
    }
    const normalized = Math.min(1, Math.max(0, speed));
    this.spinSpeed = normalized;
    const time = this.context.currentTime;
    const responseTime = normalized < 0.12 ? 0.065 : 0.04;
    this.spinSource.playbackRate.setTargetAtTime(0.45 + normalized * 1.35, time, responseTime);
    this.spinFilter.frequency.setTargetAtTime(220 + normalized * 1_180, time, responseTime);
    this.spinGain.gain.setTargetAtTime(
      this.spinGainForSpeed(normalized),
      time,
      responseTime,
    );
  }

  stopSpin(fadeMs = 120) {
    const source = this.spinSource;
    const gain = this.spinGain;
    const context = this.context;
    this.spinSource = null;
    this.spinGain = null;
    this.spinFilter = null;
    this.spinSpeed = 0;
    if (!source || !gain || !context) {
      return;
    }
    const end = context.currentTime + Math.max(0.02, fadeMs / 1_000);
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    source.stop(end + 0.02);
  }

  winner() {
    if (!this.enabled) {
      return;
    }
    this.stopSpin(80);
    const context = this.getContext();
    if (!context) {
      return;
    }
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.075;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, this.volume * 0.12),
        start + 0.015,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });
  }

  dispose() {
    this.stopSpin(20);
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }

  private clampVolume(volume: number) {
    return Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0.55));
  }

  private spinGainForSpeed(speed: number) {
    const normalized = Math.min(1, Math.max(0, speed));
    return Math.max(0.0001, this.volume * (0.004 + normalized * 0.044));
  }

  private getContext() {
    if (!this.enabled || typeof window === "undefined") {
      return null;
    }
    if (this.context) {
      return this.context;
    }
    const AudioContextConstructor = window.AudioContext
      ?? (window as SafariWindow).webkitAudioContext;
    if (!AudioContextConstructor) {
      return null;
    }
    this.context = new AudioContextConstructor();
    return this.context;
  }
}
