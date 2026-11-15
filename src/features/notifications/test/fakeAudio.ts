// A stand-in for the Web Audio API, which jsdom lacks: an AudioContext that stays suspended until `resume`, which works only while the browser `allows`
// it (a real gesture), and records what the chime schedules. Used by the chime's tests (lib/chime.test.ts) and the bell's. Import from tests only.

/** An AudioParam that records what it was told. */
export class FakeParam {
  events: { kind: 'set' | 'linear' | 'exponential'; value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number) {
    this.events.push({ kind: 'set', value, time });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ kind: 'linear', value, time });
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ kind: 'exponential', value, time });
    return this;
  }
}

export class FakeOscillator {
  type = 'square';
  frequency = new FakeParam();
  target: unknown = null;
  startAt: number | null = null;
  stopAt: number | null = null;
  onended: (() => void) | null = null;
  connect(node: unknown) {
    this.target = node;
    return node;
  }
  disconnect() {}
  start(time: number) {
    this.startAt = time;
  }
  stop(time: number) {
    this.stopAt = time;
  }
}

export class FakeGain {
  gain = new FakeParam();
  target: unknown = null;
  connect(node: unknown) {
    this.target = node;
    return node;
  }
  disconnect() {}
}

export class FakeAudioContext {
  /** Every context made, newest last (the bell's chime makes one per page). */
  static made: FakeAudioContext[] = [];
  state: AudioContextState = 'suspended';
  currentTime = 12;
  destination = { name: 'speakers' };
  allows = true;
  resumes = 0;
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  constructor() {
    FakeAudioContext.made.push(this);
  }
  async resume() {
    this.resumes += 1;
    if (this.allows) this.state = 'running';
  }
  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  /** The pitches of the notes scheduled so far, in order. */
  notes(): number[] {
    return this.oscillators.map((oscillator) => oscillator.frequency.events[0]?.value ?? 0);
  }
}
