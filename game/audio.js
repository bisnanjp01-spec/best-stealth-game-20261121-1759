// Lantern Thief — all sound is synthesised with WebAudio; no audio files.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.16;
    return this.muted;
  }

  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  step(sneaking) {
    this.blip(sneaking ? 140 : 95, 0.07, 'sine', sneaking ? 0.25 : 0.6, 70);
  }

  pebble() {
    this.blip(900, 0.08, 'square', 0.25, 500);
    setTimeout(() => this.blip(620, 0.1, 'triangle', 0.3, 300), 90);
  }

  pickup() {
    this.blip(660, 0.12, 'sine', 0.5, 660);
    setTimeout(() => this.blip(990, 0.18, 'sine', 0.5, 990), 90);
  }

  alert() {
    this.blip(220, 0.28, 'sawtooth', 0.5, 440);
    setTimeout(() => this.blip(330, 0.3, 'sawtooth', 0.4, 165), 160);
  }

  caught() {
    this.blip(180, 0.5, 'sawtooth', 0.6, 55);
  }

  exitOpen() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'sine', 0.45, f), i * 110));
  }

  // A short two-note chime when a level begins, so the start is audible.
  levelStart() {
    this.blip(392, 0.14, 'triangle', 0.35, 392);
    setTimeout(() => this.blip(523, 0.2, 'triangle', 0.35, 523), 120);
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.45, f), i * 130));
  }
}
