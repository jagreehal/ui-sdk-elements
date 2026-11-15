export const TRACKS = ["Kick", "Snare", "Clap", "Hat", "Open hat", "Pluck"] as const
export type Track = (typeof TRACKS)[number]

export type Voice = { level: number; pitch: number; decay: number; send: number; muted: boolean }
export type Kit = "analog" | "crisp" | "dust"

const PENTATONIC = [0, 3, 5, 7, 10, 12, 15, 17]
const LOOKAHEAD = 0.12

export class Engine {
  readonly voices: Voice[] = TRACKS.map((track) => ({
    level: track === "Kick" ? 0.9 : track === "Pluck" ? 0.55 : 0.7,
    pitch: 0,
    decay: 1,
    send: track === "Pluck" || track === "Clap" ? 0.35 : 0.08,
    muted: false
  }))
  kit: Kit = "analog"
  bpm = 112
  swing = 0.12
  delayDivision = 0.75
  feedback = 0.38
  playing = false
  onStep: (step: number, time: number) => void = () => {}
  isOn: (row: number, step: number) => boolean = () => false

  #ctx?: AudioContext
  #out!: GainNode
  #tone!: BiquadFilterNode
  #send!: GainNode
  #delay!: DelayNode
  #feedback!: GainNode
  #noise!: AudioBuffer
  analyser!: AnalyserNode
  #step = 0
  #next = 0
  #timer?: ReturnType<typeof setInterval>

  get context() {
    return this.#ctx
  }

  #setup() {
    if (this.#ctx) return this.#ctx
    const ctx = new AudioContext({ latencyHint: "interactive" })
    this.#out = ctx.createGain()
    this.#tone = ctx.createBiquadFilter()
    this.#tone.type = "lowpass"
    // The Web Audio factory's name is fixed by the platform, so it's looked up by string.
    const drive = ctx["createWaveShaper"]()
    drive.curve = softClip(1.6)
    drive.oversample = "2x"
    const glue = ctx.createDynamicsCompressor()
    glue.threshold.value = -14
    glue.ratio.value = 3
    glue.attack.value = 0.01
    glue.release.value = 0.18
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.78

    this.#send = ctx.createGain()
    this.#delay = ctx.createDelay(2)
    this.#feedback = ctx.createGain()
    const wet = ctx.createBiquadFilter()
    wet.type = "bandpass"
    wet.frequency.value = 1800
    wet.Q.value = 0.6
    this.#send.connect(this.#delay)
    this.#delay.connect(wet)
    wet.connect(this.#feedback)
    this.#feedback.connect(this.#delay)
    wet.connect(this.#out)

    this.#out.connect(this.#tone)
    this.#tone.connect(drive)
    drive.connect(glue)
    glue.connect(this.analyser)
    this.analyser.connect(ctx.destination)

    this.#noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = this.#noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    this.#ctx = ctx
    this.applyKit()
    this.applySpace()
    return ctx
  }

  applyKit() {
    if (!this.#ctx) return
    const now = this.#ctx.currentTime
    this.#tone.frequency.setTargetAtTime(this.kit === "dust" ? 3200 : 18000, now, 0.05)
    this.#tone.Q.setTargetAtTime(this.kit === "dust" ? 2.2 : 0.7, now, 0.05)
    this.#out.gain.setTargetAtTime(this.kit === "crisp" ? 0.8 : 0.9, now, 0.05)
  }

  applySpace() {
    if (!this.#ctx) return
    const now = this.#ctx.currentTime
    this.#delay.delayTime.setTargetAtTime(Math.min(1.9, (60 / this.bpm) * this.delayDivision), now, 0.08)
    this.#feedback.gain.setTargetAtTime(this.feedback, now, 0.05)
  }

  async start() {
    const ctx = this.#setup()
    await ctx.resume()
    if (this.playing) return
    this.playing = true
    this.#step = 0
    this.#next = ctx.currentTime + 0.06
    this.#timer = setInterval(() => this.#schedule(), 25)
    this.#schedule()
  }

  stop() {
    this.playing = false
    clearInterval(this.#timer)
  }

  /** Plays one hit now, for previewing a cell as it's switched on. */
  audition(row: number) {
    const ctx = this.#setup()
    void ctx.resume()
    this.#trigger(row, ctx.currentTime + 0.005, 0)
  }

  // Schedules a little ahead on the audio clock, so timing never depends on the main thread.
  #schedule() {
    const ctx = this.#ctx!
    const sixteenth = 60 / this.bpm / 4
    while (this.#next < ctx.currentTime + LOOKAHEAD) {
      const step = this.#step
      const time = this.#next + (step % 2 ? this.swing * sixteenth : 0)
      for (let row = 0; row < TRACKS.length; row++) {
        if (!this.voices[row]!.muted && this.isOn(row, step)) this.#trigger(row, time, step)
      }
      this.onStep(step, time)
      this.#next += sixteenth
      this.#step = (step + 1) % 16
    }
  }

  #voiceOut(row: number, time: number) {
    const ctx = this.#ctx!
    const voice = this.voices[row]!
    const gain = ctx.createGain()
    gain.gain.value = voice.level
    gain.connect(this.#out)
    if (voice.send > 0) {
      const send = ctx.createGain()
      send.gain.value = voice.send
      gain.connect(send)
      send.connect(this.#send)
    }
    return { gain, voice, ratio: 2 ** (voice.pitch / 12), stopAt: (seconds: number) => time + seconds * voice.decay }
  }

  #envelope(param: AudioParam, time: number, peak: number, end: number, attack = 0.002) {
    param.setValueAtTime(0.0001, time)
    param.exponentialRampToValueAtTime(peak, time + attack)
    param.exponentialRampToValueAtTime(0.0001, end)
  }

  #noiseSource(time: number, end: number) {
    const source = this.#ctx!.createBufferSource()
    source.buffer = this.#noise
    source.start(time, Math.random() * 0.5)
    source.stop(end + 0.05)
    return source
  }

  #trigger(row: number, time: number, step: number) {
    const ctx = this.#ctx!
    const { gain, ratio, stopAt } = this.#voiceOut(row, time)
    const dust = this.kit === "dust"
    const crisp = this.kit === "crisp"

    switch (TRACKS[row]) {
      case "Kick": {
        const end = stopAt(crisp ? 0.32 : 0.48)
        const osc = ctx.createOscillator()
        const amp = ctx.createGain()
        osc.frequency.setValueAtTime(165 * ratio, time)
        osc.frequency.exponentialRampToValueAtTime(44 * ratio, time + 0.11)
        this.#envelope(amp.gain, time, 1, end)
        osc.connect(amp).connect(gain)
        osc.start(time)
        osc.stop(end + 0.05)
        const click = ctx.createOscillator()
        const clickAmp = ctx.createGain()
        click.type = "square"
        click.frequency.value = 1800
        this.#envelope(clickAmp.gain, time, crisp ? 0.25 : 0.12, time + 0.012, 0.0005)
        click.connect(clickAmp).connect(gain)
        click.start(time)
        click.stop(time + 0.03)
        break
      }
      case "Snare": {
        const end = stopAt(0.22)
        const body = ctx.createOscillator()
        const bodyAmp = ctx.createGain()
        body.type = "triangle"
        body.frequency.setValueAtTime(220 * ratio, time)
        body.frequency.exponentialRampToValueAtTime(160 * ratio, time + 0.08)
        this.#envelope(bodyAmp.gain, time, 0.6, time + 0.12)
        body.connect(bodyAmp).connect(gain)
        body.start(time)
        body.stop(time + 0.15)
        const filter = ctx.createBiquadFilter()
        filter.type = "highpass"
        filter.frequency.value = (dust ? 900 : 1600) * ratio
        const amp = ctx.createGain()
        this.#envelope(amp.gain, time, 0.75, end)
        this.#noiseSource(time, end).connect(filter).connect(amp).connect(gain)
        break
      }
      case "Clap": {
        const end = stopAt(0.3)
        const filter = ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 1400 * ratio
        filter.Q.value = 1.2
        const amp = ctx.createGain()
        amp.gain.setValueAtTime(0.0001, time)
        for (const offset of [0, 0.011, 0.023]) {
          amp.gain.setValueAtTime(0.9, time + offset)
          amp.gain.exponentialRampToValueAtTime(0.15, time + offset + 0.009)
        }
        amp.gain.exponentialRampToValueAtTime(0.0001, end)
        this.#noiseSource(time, end).connect(filter).connect(amp).connect(gain)
        break
      }
      case "Hat":
      case "Open hat": {
        const open = TRACKS[row] === "Open hat"
        const end = stopAt(open ? 0.42 : crisp ? 0.04 : 0.07)
        const filter = ctx.createBiquadFilter()
        filter.type = "highpass"
        filter.frequency.value = (dust ? 5200 : 7600) * ratio
        const amp = ctx.createGain()
        this.#envelope(amp.gain, time, open ? 0.45 : 0.5, end, 0.001)
        this.#noiseSource(time, end).connect(filter).connect(amp).connect(gain)
        break
      }
      case "Pluck": {
        const end = stopAt(0.38)
        const note = 196 * ratio * 2 ** (PENTATONIC[(step * 3 + Math.floor(step / 4)) % PENTATONIC.length]! / 12)
        const carrier = ctx.createOscillator()
        const modulator = ctx.createOscillator()
        const depth = ctx.createGain()
        const amp = ctx.createGain()
        carrier.type = dust ? "triangle" : "sine"
        carrier.frequency.value = note
        modulator.frequency.value = note * (crisp ? 3.5 : 2)
        depth.gain.setValueAtTime(note * (crisp ? 3 : 1.8), time)
        depth.gain.exponentialRampToValueAtTime(1, end)
        this.#envelope(amp.gain, time, 0.5, end, 0.003)
        modulator.connect(depth).connect(carrier.frequency)
        carrier.connect(amp).connect(gain)
        for (const osc of [carrier, modulator]) {
          osc.start(time)
          osc.stop(end + 0.05)
        }
        break
      }
    }
  }
}

function softClip(amount: number) {
  const curve = new Float32Array(1024)
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount)
  }
  return curve
}
