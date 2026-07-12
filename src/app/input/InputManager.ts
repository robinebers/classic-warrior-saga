import type { World } from '@game-core/World'

/** Classic-ish defaults: WASD move (A/D turn), Q/E strafe, Space jump, Tab target, T attack. */
export class InputManager {
  private keys = new Set<string>()
  private mouseLook = false
  private lastMx = 0
  private lastMy = 0
  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code)
    if (['Space', 'Tab'].includes(e.code)) e.preventDefault()
    if (e.code === 'Tab') this._tab = true
    if (e.code === 'KeyT') this._toggleAA = true
    if (e.code === 'Space') this._jump = true
    if (e.code === 'Backquote') this.openConsole()
    const abilityKeys: Record<string, number> = {
      Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5,
      Digit7: 6, Digit8: 7, Digit9: 8, Digit0: 9, Minus: 10, Equal: 11,
    }
    if (e.code in abilityKeys) this._abilitySlot = abilityKeys[e.code]
  }
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 2 || e.button === 0) {
      this.mouseLook = true
      this.lastMx = e.clientX
      this.lastMy = e.clientY
    }
  }
  private onMouseUp = () => {
    this.mouseLook = false
  }
  private onMouseMove = (e: MouseEvent) => {
    if (!this.mouseLook) return
    const dx = e.clientX - this.lastMx
    const dy = e.clientY - this.lastMy
    this.lastMx = e.clientX
    this.lastMy = e.clientY
    this._yawDelta += dx * 0.005
    const pitchRef = (window as unknown as { __cwsPitch?: { current: number } }).__cwsPitch
    if (pitchRef) {
      pitchRef.current = Math.max(-1.2, Math.min(0.4, pitchRef.current - dy * 0.005))
    }
  }
  private onContext = (e: Event) => e.preventDefault()

  private _tab = false
  private _toggleAA = false
  private _jump = false
  private _yawDelta = 0
  private _abilitySlot: number | null = null

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('contextmenu', this.onContext)
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('contextmenu', this.onContext)
  }

  pump(world: World): void {
    let forward = 0
    let strafe = 0
    let turn = 0
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1
    // Classic: A/D turn when not mouselooking; Q/E strafe
    if (this.keys.has('KeyQ')) strafe -= 1
    if (this.keys.has('KeyE')) strafe += 1
    if (!this.mouseLook) {
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) turn += 1
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) turn -= 1
    } else {
      if (this.keys.has('KeyA')) strafe -= 1
      if (this.keys.has('KeyD')) strafe += 1
    }
    world.queueIntent({ type: 'move', forward, strafe, turn })
    if (this._yawDelta) {
      world.queueIntent({ type: 'setYaw', yaw: world.player.yaw + this._yawDelta })
      this._yawDelta = 0
    }
    if (this._jump) {
      world.queueIntent({ type: 'jump' })
      this._jump = false
    }
    if (this._tab) {
      world.queueIntent({ type: 'tabTarget' })
      this._tab = false
    }
    if (this._toggleAA) {
      world.queueIntent({ type: 'toggleAutoAttack' })
      this._toggleAA = false
    }
    if (this._abilitySlot != null) {
      world.queueIntent({ type: 'useAbility', slot: this._abilitySlot })
      this._abilitySlot = null
    }
  }

  private openConsole(): void {
    const line = window.prompt('Console (~)')
    if (!line) return
    const parts = line.trim().replace(/^\//, '').split(/\s+/)
    const cmd = parts[0]?.toLowerCase()
    if (!cmd) return
    // Access store world via custom event to avoid circular imports
    window.dispatchEvent(
      new CustomEvent('cws-console', { detail: { cmd, args: parts.slice(1) } }),
    )
  }
}
