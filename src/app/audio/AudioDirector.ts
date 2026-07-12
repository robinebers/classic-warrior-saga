import { Howl, Howler } from 'howler'

type Bus = 'music' | 'ambience' | 'sfx' | 'ui'

/**
 * Maps sounds.json events → Howler buses.
 * Missing files warn once and never throw.
 */
export class AudioDirector {
  private warned = new Set<string>()
  private music: Howl | null = null
  private gains: Record<Bus, number> = {
    music: Math.pow(10, -12 / 20),
    ambience: 0.4,
    sfx: 1,
    ui: 0.8,
  }

  setBusGain(bus: Bus, linear: number): void {
    this.gains[bus] = Math.max(0, Math.min(1, linear))
    if (bus === 'music' && this.music) this.music.volume(this.gains.music)
  }

  playFiles(files: string[], bus: Bus = 'sfx', opts?: { loop?: boolean }): void {
    for (const file of files) {
      const src = file.startsWith('/') ? file : `/${file}`
      try {
        const sound = new Howl({
          src: [src],
          volume: this.gains[bus],
          loop: !!opts?.loop,
          onloaderror: () => this.warn(src),
          onplayerror: () => this.warn(src),
        })
        sound.play()
        if (bus === 'music') {
          this.music?.stop()
          this.music = sound
        }
      } catch {
        this.warn(src)
      }
    }
  }

  playEvent(eventId: string, manifest: SoundsManifest): void {
    const ev = manifest.events[eventId]
    if (!ev) return
    if (ev.files) this.playFiles(ev.files, (ev.bus as Bus) || 'sfx', { loop: ev.loop })
  }

  duckMusic(inCombat: boolean): void {
    if (!this.music) return
    const base = this.gains.music
    this.music.volume(inCombat ? base * 0.5 : base)
  }

  private warn(src: string): void {
    if (this.warned.has(src)) return
    this.warned.add(src)
    console.warn(`[CWS audio] Missing or unreadable: ${src}`)
  }
}

export type SoundsManifest = {
  pools: Record<string, string[]>
  events: Record<
    string,
    {
      files?: string[]
      bus?: string
      loop?: boolean
      layer?: boolean
      poolByWeapon?: boolean
      gainDb?: number
      spatial?: boolean
    }
  >
}

export async function loadSoundsManifest(): Promise<SoundsManifest> {
  try {
    const res = await fetch('/game-data/sounds.json')
    return (await res.json()) as SoundsManifest
  } catch {
    return { pools: {}, events: {} }
  }
}

export const audioDirector = new AudioDirector()

// Silence Howler HTML5 unlock spam in headless
Howler.autoUnlock = true
