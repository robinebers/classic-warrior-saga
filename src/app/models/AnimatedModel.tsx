import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { AnimKind } from '@game-core/World'

type Pose = {
  x: number
  y: number
  z: number
  yaw: number
  anim: AnimKind
  visible?: boolean
}

type Props = {
  url: string
  scale?: number
  yOffset?: number
  tintGreen?: boolean
  getPose: () => Pose
}

function pickClip(names: string[], kind: AnimKind): string | undefined {
  const lower = names.map((n) => ({ n, l: n.toLowerCase() }))
  const find = (...keys: string[]) => lower.find((x) => keys.some((k) => x.l.includes(k)))?.n
  switch (kind) {
    case 'attack':
      return find('attack', '2h_melee_attack_chop', 'melee_attack')
    case 'death':
      return find('death', 'die')
    case 'run':
      return find('running_a', 'run', 'running')
    case 'walk':
      return find('walking_a', 'walk', 'walking')
    case 'idle':
    default:
      return find('idle', '2h_melee_idle', 'wait', 'neutral', 'unarmed_idle')
  }
}

export function AnimatedModel({
  url,
  scale = 1,
  yOffset = 0,
  tintGreen = false,
  getPose,
}: Props) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(url)
  const clone = useMemo(() => skeletonClone(scene) as THREE.Object3D, [scene])
  const { actions, names, mixer } = useAnimations(animations, group)
  const current = useRef<string | null>(null)

  useEffect(() => {
    clone.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      if (!tintGreen || !m.material) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial
        if (!std.color) continue
        // one-shot greenish multiply for orc-ish KayKit skin (don't stack)
        if (!(std.userData as { tinted?: boolean }).tinted) {
          std.color.set('#7cbc5a')
          ;(std.userData as { tinted?: boolean }).tinted = true
          std.needsUpdate = true
        }
      }
    })
  }, [clone, tintGreen])

  useFrame((_, delta) => {
    mixer?.update(delta)
    const pose = getPose()
    const g = group.current
    if (!g) return
    g.visible = pose.visible !== false
    g.position.set(pose.x, pose.y + yOffset, pose.z)
    g.rotation.y = pose.yaw

    const name = pickClip(names, pose.anim)
    if (!name || !actions[name]) return
    if (current.current === name) return
    const next = actions[name]
    const prev = current.current ? actions[current.current] : null
    prev?.fadeOut(0.12)
    next.reset().fadeIn(0.12).play()
    if (pose.anim === 'attack' || pose.anim === 'death') {
      next.setLoop(THREE.LoopOnce, 1)
      next.clampWhenFinished = true
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity)
    }
    current.current = name
  })

  return (
    <group ref={group} scale={scale} dispose={null}>
      <primitive object={clone} />
    </group>
  )
}

useGLTF.preload('/models/orc/classic_orc.glb')
useGLTF.preload('/models/boar/pig.glb')
useGLTF.preload('/models/orc/kaykit_barbarian.glb')
