import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from './store'
import { InputManager } from './input/InputManager'
import { TICK_DT } from '@game-core/World'
import { Hud } from './hud/Hud'
import { AnimatedModel } from './models/AnimatedModel'
import {
  MAP_HALF,
  ROCKS,
  REST_CAMP,
  sampleHeight,
  scrubPositions,
  zoneAt,
  zoneColor,
} from '@game-core/world/Heightmap'

function Terrain() {
  const dirtMap = useLoader(THREE.TextureLoader, '/textures/dirt_red.jpg')

  const geo = useMemo(() => {
    const segs = 256
    const size = MAP_HALF * 2
    const g = new THREE.PlaneGeometry(size, size, segs, segs)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const uvs = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = sampleHeight(x, z)
      pos.setY(i, y)
      uvs.setXY(i, x * 0.05, z * 0.05)
      const [r, gc, b] = zoneColor(zoneAt(x, z))
      const e = 0.5
      const slope = Math.hypot(
        sampleHeight(x + e, z) - sampleHeight(x - e, z),
        sampleHeight(x, z + e) - sampleHeight(x, z - e),
      )
      const rockMix = Math.min(1, slope * 0.5)
      colors[i * 3] = Math.min(1, r * 1.2 * (1 - rockMix * 0.1) + rockMix * 0.5)
      colors[i * 3 + 1] = Math.min(1, gc * (1 - rockMix * 0.45) + rockMix * 0.22)
      colors[i * 3 + 2] = Math.min(1, b * (1 - rockMix * 0.3) + rockMix * 0.12)
    }
    pos.needsUpdate = true
    uvs.needsUpdate = true
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  useMemo(() => {
    dirtMap.wrapS = dirtMap.wrapT = THREE.RepeatWrapping
    dirtMap.anisotropy = 8
    dirtMap.colorSpace = THREE.SRGBColorSpace
  }, [dirtMap])

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial map={dirtMap} vertexColors roughness={0.94} metalness={0.03} />
    </mesh>
  )
}

function Rocks() {
  const rockMap = useLoader(THREE.TextureLoader, '/textures/rock_red.jpg')
  useMemo(() => {
    rockMap.wrapS = rockMap.wrapT = THREE.RepeatWrapping
    rockMap.colorSpace = THREE.SRGBColorSpace
  }, [rockMap])

  return (
    <group>
      {ROCKS.map((r, i) => {
        const y = sampleHeight(r.x, r.z)
        return (
          <group key={i} position={[r.x, y, r.z]}>
            <mesh position={[0, r.height * 0.35, 0]} castShadow rotation={[0.1, i * 0.7, 0.05]}>
              <dodecahedronGeometry args={[r.radius * 1.05, 0]} />
              <meshStandardMaterial
                map={rockMap}
                color="#c46838"
                roughness={0.92}
                flatShading
              />
            </mesh>
            {r.height > 12 && (
              <mesh position={[r.radius * 0.4, r.height * 0.55, -r.radius * 0.2]} rotation={[0, 1, 0.2]}>
                <dodecahedronGeometry args={[r.radius * 0.55, 0]} />
                <meshStandardMaterial map={rockMap} color="#a05028" roughness={0.95} flatShading />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

function Scrub() {
  const items = useMemo(() => scrubPositions(140), [])
  return (
    <group>
      {items.map((s, i) => {
        const y = sampleHeight(s.x, s.z)
        if (s.kind === 'cactus') {
          return (
            <group key={i} position={[s.x, y, s.z]}>
              <mesh position={[0, 1.1, 0]}>
                <cylinderGeometry args={[0.18, 0.22, 2.2, 6]} />
                <meshStandardMaterial color="#3d6b28" flatShading />
              </mesh>
              <mesh position={[0.45, 1.3, 0]} rotation={[0, 0, 0.9]}>
                <cylinderGeometry args={[0.1, 0.12, 0.9, 5]} />
                <meshStandardMaterial color="#3d6b28" flatShading />
              </mesh>
            </group>
          )
        }
        if (s.kind === 'bone') {
          return (
            <mesh key={i} position={[s.x, y + 0.08, s.z]} rotation={[0.2, i, 0.1]}>
              <capsuleGeometry args={[0.06, 0.7, 3, 6]} />
              <meshStandardMaterial color="#d8c8a0" />
            </mesh>
          )
        }
        // scrub bush
        return (
          <mesh key={i} position={[s.x, y + 0.35, s.z]}>
            <sphereGeometry args={[0.45 + (i % 3) * 0.12, 5, 4]} />
            <meshStandardMaterial color="#5a4a22" flatShading />
          </mesh>
        )
      })}
    </group>
  )
}

function Campfire() {
  const y = sampleHeight(REST_CAMP.x, REST_CAMP.z)
  return (
    <group position={[REST_CAMP.x, y, REST_CAMP.z]}>
      {/* ring of stones */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.3, 0.12, Math.sin(a) * 1.3]}>
            <dodecahedronGeometry args={[0.28, 0]} />
            <meshStandardMaterial color="#6a4030" flatShading />
          </mesh>
        )
      })}
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.5, 1.3, 7]} />
        <meshStandardMaterial color="#ff6a18" emissive="#ff3a00" emissiveIntensity={1.1} />
      </mesh>
      <pointLight color="#ff8020" intensity={3.5} distance={28} position={[0, 1.4, 0]} />
      {/* hide tent */}
      <mesh position={[4.2, 1.35, 2.5]} rotation={[0, 0.4, 0]}>
        <coneGeometry args={[2.4, 2.8, 4]} />
        <meshStandardMaterial color="#7a5528" />
      </mesh>
      <mesh position={[4.2, 0.2, 2.5]}>
        <cylinderGeometry args={[2.3, 2.3, 0.15, 8]} />
        <meshStandardMaterial color="#4a3218" />
      </mesh>
    </group>
  )
}

function PlayerView() {
  const world = useGameStore((s) => s.world)
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
  const pitch = useRef(-0.32)
  const dist = useRef(12)

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      dist.current = THREE.MathUtils.clamp(dist.current + e.deltaY * 0.01, 0.1, 18)
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
    const oy = 3.2 + Math.sin(-pitch.current) * d * 0.4
    camera.position.lerp(
      new THREE.Vector3(p.position.x + ox, p.position.y + oy, p.position.z + oz),
      0.12,
    )
    camera.lookAt(p.position.x, p.position.y + 1.4, p.position.z)
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
    <div style={{ width: '100vw', height: '100vh', background: '#2a1810' }} data-testid="game-root">
      <Canvas
        shadows={false}
        dpr={[1, 1.25]}
        camera={{ fov: 58, near: 0.1, far: 900, position: [0, 14, 18] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
      >
        {/* Barrens heat haze sky */}
        <color attach="background" args={['#c4a574']} />
        <fog attach="fog" args={['#d2b48c', 45, 260]} />
        <ambientLight intensity={0.55} color="#ffd2a0" />
        <directionalLight intensity={1.55} position={[60, 80, 30]} color="#ffe0b0" />
        <hemisphereLight args={['#f0c878', '#8a4020', 0.55]} />
        <Sky
          sunPosition={[80, 18, 40]}
          turbidity={12}
          rayleigh={0.6}
          mieCoefficient={0.02}
          mieDirectionalG={0.85}
        />
        <Terrain />
        <Rocks />
        <Scrub />
        <Campfire />
        <PlayerView />
        <MobsView />
        <CameraRig />
        <SimLoop input={input} />
      </Canvas>
      <Hud />
    </div>
  )
}
