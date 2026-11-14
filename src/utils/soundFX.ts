// Procedural Web Audio API sound synthesis for aerospace rocket simulation (zero external audio file dependencies)

class SoundFX {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false
  private engineGain: GainNode | null = null
  private engineNoiseNode: AudioNode | null = null

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted
    if (this.engineGain) {
      this.engineGain.gain.value = muted ? 0 : 0.4
    }
  }

  public playBeep(freq = 880, duration = 0.1, type: OscillatorType = 'sine') {
    if (this.isMuted) return
    try {
      this.initCtx()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + duration)
    } catch {}
  }

  public playCountdownBeep(isTZero = false) {
    if (isTZero) {
      this.playBeep(1320, 0.4, 'triangle')
    } else {
      this.playBeep(880, 0.08, 'sine')
    }
  }

  public playStageSeparation() {
    if (this.isMuted) return
    try {
      this.initCtx()
      if (!this.ctx) return
      // Metallic mechanical clang & pneumatic release
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.35)
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.4)
    } catch {}
  }

  public playDeploymentChime() {
    if (this.isMuted) return
    try {
      this.initCtx()
      if (!this.ctx) return
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator()
        const gain = this.ctx!.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.12)
        gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * 0.12)
        gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + idx * 0.12 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.12 + 0.5)
        osc.connect(gain)
        gain.connect(this.ctx!.destination)
        osc.start(this.ctx!.currentTime + idx * 0.12)
        osc.stop(this.ctx!.currentTime + idx * 0.12 + 0.5)
      })
    } catch {}
  }

  public startEngineRoar() {
    if (this.isMuted) return
    try {
      this.initCtx()
      if (!this.ctx || this.engineGain) return

      // Brown/Pink noise for low-frequency rocket combustion roar
      const bufferSize = this.ctx.sampleRate * 2
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99 * b0 + white * 0.05
        b1 = 0.95 * b1 + white * 0.08
        b2 = 0.9 * b2 + white * 0.12
        output[i] = (b0 + b1 + b2) * 0.8
      }

      const whiteNoise = this.ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      // Lowpass filter to emulate deep rumble
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(260, this.ctx.currentTime)

      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime)
      gain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime + 1.2)

      whiteNoise.connect(filter)
      filter.connect(gain)
      gain.connect(this.ctx.destination)
      whiteNoise.start()

      this.engineNoiseNode = whiteNoise
      this.engineGain = gain
    } catch {}
  }

  public stopEngineRoar() {
    try {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5)
        setTimeout(() => {
          if (this.engineNoiseNode) {
            try { (this.engineNoiseNode as any).stop() } catch {}
            this.engineNoiseNode.disconnect()
            this.engineNoiseNode = null
          }
          if (this.engineGain) {
            this.engineGain.disconnect()
            this.engineGain = null
          }
        }, 550)
      }
    } catch {}
  }
}

export const soundFX = new SoundFX()

