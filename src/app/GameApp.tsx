import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from './store'
import { InputManager } from './input/InputManager'
import { TICK_DT } from '@game-core/World'
import { Hud } from './hud/Hud'
import { AnimatedModel } from './models/AnimatedModel'

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(400, 400, 128, 128)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = Math.sin(x * 0.05) * 0.4 + Math.cos(z * 0.05) * 0.4
      pos.setY(i, y)
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#8a5a3c" roughness={0.95} metalness={0.05} />
    </mesh>
  )
}

function PlayerView() {
  const world = useGameStore((s) => s.world)
  // KayKit barbarian: clean GLB + rich idle/run/attack clips; green tint ≈ orc
  return (
    <AnimatedModel
      url="/models/orc/kaykit_barbarian.glb"
      scale={0.85}
      tintGreen
      getPose={() => {
        const p = world.player
        return { x: p.position.x, y: p.position.y, z: p.position.z, yaw: p.yaw, anim: p.anim }
      }}
    />
  )
}

function MobsView() {
  const world = useGameStore((s) => s.world)
  // Stable list of ids — remount when spawn set changes via store sync count
  const mobIds = useGameStore((s) => [...s.world.mobs.keys()].join(','))
  const ids = mobIds.split(',').filter(Boolean).map(Number)

  return (
    <>
      {ids.map((id) => {
        const m = world.mobs.get(id)
        if (!m) return null
        const isBoar = m.archetype.includes('boar') || m.archetype.includes('bristle')
        if (isBoar) {
          return (
            <AnimatedModel
              key={id}
              url="/models/boar/pig.glb"
              scale={0.35}
              getPose={() => {
                const mob = world.mobs.get(id)
                if (!mob) return { x: 0, y: -100, z: 0, yaw: 0, anim: 'idle', visible: false }
                return {
                  x: mob.position.x,
                  y: mob.position.y,
                  z: mob.position.z,
                  yaw: mob.yaw,
                  anim: mob.anim,
                  visible: true,
                }
              }}
            />
          )
        }
        return <PrimitiveMob key={id} id={id} />
      })}
    </>
  )
}

function PrimitiveMob({ id }: { id: number }) {
  const world = useGameStore((s) => s.world)
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const m = world.mobs.get(id)
    if (!ref.current || !m) return
    ref.current.visible = m.alive || m.anim === 'death'
    ref.current.position.set(m.position.x, m.position.y + 0.5, m.position.z)
  })
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.55, 12, 10]} />
      <meshStandardMaterial color="#c45c1a" />
    </mesh>
  )
}

function CameraRig() {
  const { camera } = useThree()
  const world = useGameStore((s) => s.world)
  const pitch = useRef(-0.28)
  const dist = useRef(10)

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      dist.current = THREE.MathUtils.clamp(dist.current + e.deltaY * 0.01, 0.1, 15)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    ;(window as unknown as { __cwsPitch?: { current: number } }).__cwsPitch = pitch
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  useFrame(() => {
    const p = world.player
    const yaw = p.yaw
    const d = dist.current
    if (d < 0.5) {
      camera.position.set(p.position.x, p.position.y + 1.6, p.position.z)
      camera.lookAt(
        p.position.x + Math.sin(yaw),
        p.position.y + 1.6 + pitch.current,
        p.position.z - Math.cos(yaw),
      )
      return
    }
    const ox = Math.sin(yaw) * -d
    const oz = Math.cos(yaw) * d
    const oy = 2.5 + Math.sin(-pitch.current) * d * 0.35
    camera.position.lerp(
      new THREE.Vector3(p.position.x + ox, p.position.y + oy, p.position.z + oz),
      0.15,
    )
    camera.lookAt(p.position.x, p.position.y + 1.3, p.position.z)
  })

  return null
}

function SimLoop({ input }: { input: InputManager }) {
  const world = useGameStore((s) => s.world)
  const handleEvents = useGameStore((s) => s.handleEvents)
  const setFps = useGameStore((s) => s.setFps)
  const sync = useGameStore((s) => s.syncFromWorld)
  const acc = useRef(0)
  const frames = useRef(0)
  const lastFps = useRef(performance.now())
  const hudAcc = useRef(0)

  useFrame((_, delta) => {
    input.pump(world)
    acc.current += Math.min(delta, 0.1)
    while (acc.current >= TICK_DT) {
      world.tick(TICK_DT)
      acc.current -= TICK_DT
    }
    const ev = world.drainEvents()
    if (ev.length) handleEvents(ev)
    hudAcc.current += delta
    if (hudAcc.current >= 0.1) {
      sync()
      hudAcc.current = 0
    }
    frames.current++
    const now = performance.now()
    if (now - lastFps.current >= 500) {
      setFps(Math.round((frames.current * 1000) / (now - lastFps.current)))
      frames.current = 0
      lastFps.current = now
    }
  })

  return null
}

export function GameApp() {
  const start = useGameStore((s) => s.start)
  const started = useGameStore((s) => s.started)
  const input = useMemo(() => new InputManager(), [])

  useEffect(() => {
    if (!started) start()
    input.attach()
    return () => input.detach()
  }, [start, started, input])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a120c' }} data-testid="game-root">
      <Canvas
        shadows={false}
        dpr={[1, 1.25]}
        camera={{ fov: 60, near: 0.1, far: 800, position: [0, 8, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#6b8cae']} />
        <fog attach="fog" args={['#c4a574', 60, 220]} />
        <ambientLight intensity={0.7} />
        <directionalLight intensity={1.2} position={[40, 60, 20]} />
        <hemisphereLight args={['#b1e1ff', '#8a5a3c', 0.45]} />
        <Sky sunPosition={[40, 20, 40]} turbidity={6} rayleigh={1.2} />
        <Terrain />
        <PlayerView />
        <MobsView />
        <CameraRig />
        <SimLoop input={input} />
      </Canvas>
      <Hud />
    </div>
  )
}
