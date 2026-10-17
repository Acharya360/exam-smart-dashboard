// Web Audio API Procedural Synthesizer for Acharya360 ExamTrack Motion Video
// Generates high-fidelity, futuristic sci-fi UI and cinematic sound effects without external audio files.

class AudioSynthEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.28, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.28, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Cinematic Sub-Bass Drop (used for opening / grand impacts)
  public playBassDrop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 1.2);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 1.35);
    } catch {}
  }

  // Futuristic Whoosh / Scene Transition sweep
  public playWhoosh() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      // White noise buffer
      const bufferSize = this.ctx.sampleRate * 0.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.25);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.5);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.55);
    } catch {}
  }

  // Tech Chime / Badge unlock sound (harmonious dual bell)
  public playTechChime(pitch: number = 880) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      [pitch, pitch * 1.5, pitch * 2].forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        const delay = idx * 0.04;
        gain.gain.setValueAtTime(0.25 / (idx + 1), now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + delay);
        osc.stop(now + delay + 0.65);
      });
    } catch {}
  }

  // Futuristic digital tick / micro-interaction blip
  public playTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // Triumphant Chord for Grand Finale
  public playFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      // C Major 9 chord: C4, E4, G4, B4, D5
      const notes = [261.63, 329.63, 392.00, 493.88, 587.33];
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        const start = now + idx * 0.08;
        gain.gain.setValueAtTime(0.01, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 2.0);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(start);
        osc.stop(start + 2.1);
      });
    } catch {}
  }
}

export const audioSynth = new AudioSynthEngine();
