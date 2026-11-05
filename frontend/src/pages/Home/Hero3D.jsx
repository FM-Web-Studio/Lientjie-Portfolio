import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap, reducedMotion, finePointer } from '../../lib/motion'
import styles from './Hero3D.module.css'

const COLORS = {
  mint: '#B0EFC3',
  coral: '#F2A7A7',
  peach: '#E8D2C2',
  lavender: '#CDBEFF',
  sky: '#A8DAFF',
  white: '#F4F4F4',
}

// An abstract architectural model: a podium, two towers, a cantilevered slab and a pavilion.
// [width, height, depth, x, z, y-base, colour]
const MASSES = [
  [4.6, 0.45, 3.4, 0, 0, 0, 'peach'],
  [1.4, 3.8, 1.4, -1.25, -0.55, 0.45, 'mint'],
  [1.15, 2.5, 1.15, 0.75, 0.75, 0.45, 'lavender'],
  [3.3, 0.32, 1.25, 0.35, -0.45, 3.0, 'coral'],
  [0.95, 1.2, 0.95, 1.75, -0.95, 0.45, 'sky'],
  [1.9, 0.08, 1.9, -1.25, -0.55, 4.25, 'white'],
  [0.7, 0.7, 0.7, -1.9, 1.2, 0.45, 'coral'],
]

// Small objects floating around the model, bobbing on their own rhythm.
const FLOATERS = [
  { shape: 'sphere', color: 'sky', pos: [2.9, 3.6, 1.6], size: 0.32 },
  { shape: 'torus', color: 'coral', pos: [-3.1, 2.7, 1.2], size: 0.34 },
  { shape: 'box', color: 'lavender', pos: [2.4, 1.2, 2.6], size: 0.36 },
  { shape: 'sphere', color: 'mint', pos: [-2.6, 4.6, -1.6], size: 0.22 },
]

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { return false }
}

/**
 * The hero's live 3D model. It rises out of the ground on load, turns slowly, leans toward the
 * pointer and swings with the scroll. Rendering pauses whenever it is off screen.
 */
export default function Hero3D({ onUnavailable }) {
  const mount = useRef(null)

  useEffect(() => {
    const host = mount.current
    if (!host || !webglAvailable()) { onUnavailable?.(); return undefined }
    const still = reducedMotion()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100)
    camera.position.set(10, 8.2, 10)
    camera.lookAt(0, 1.6, 0)

    scene.add(new THREE.HemisphereLight('#ffffff', '#3a3a48', 1.25))
    const sun = new THREE.DirectionalLight('#ffffff', 2.4)
    sun.position.set(6, 10, 5)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 })
    sun.shadow.radius = 4
    scene.add(sun)
    const rim = new THREE.DirectionalLight('#C9B8FF', 0.9)
    rim.position.set(-6, 4, -6)
    scene.add(rim)

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const model = new THREE.Group()
    scene.add(model)
    const disposables = []
    const lineMat = new THREE.LineBasicMaterial({ color: '#1a1a1a', transparent: true, opacity: 0.35 })
    disposables.push(lineMat)

    const blocks = MASSES.map(([w, h, d, x, z, y, c]) => {
      const geo = new THREE.BoxGeometry(w, h, d)
      geo.translate(0, h / 2, 0)
      const mat = new THREE.MeshStandardMaterial({ color: COLORS[c], roughness: 0.55, metalness: 0.02 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat)
      mesh.add(edges)
      model.add(mesh)
      disposables.push(geo, mat, edges.geometry)
      return mesh
    })

    // Thin columns carrying the cantilever.
    const colGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.55, 12)
    const colMat = new THREE.MeshStandardMaterial({ color: COLORS.white, roughness: 0.4 })
    disposables.push(colGeo, colMat)
    ;[[1.75, 0.0], [1.75, -0.9], [0.95, -0.9]].forEach(([x, z]) => {
      const col = new THREE.Mesh(colGeo, colMat)
      col.position.set(x, 0.45 + 2.55 / 2, z)
      col.castShadow = true
      model.add(col)
      blocks.push(col)
    })

    const floaters = FLOATERS.map(({ shape, color, pos, size }, i) => {
      const geo = shape === 'sphere' ? new THREE.SphereGeometry(size, 32, 32)
        : shape === 'torus' ? new THREE.TorusGeometry(size, size * 0.38, 20, 48)
          : new THREE.BoxGeometry(size * 1.4, size * 1.4, size * 1.4)
      const mat = new THREE.MeshStandardMaterial({ color: COLORS[color], roughness: 0.35, metalness: 0.05 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(...pos)
      mesh.castShadow = true
      mesh.userData = { base: pos[1], phase: i * 1.7 }
      scene.add(mesh)
      disposables.push(geo, mat)
      return mesh
    })

    const size = () => {
      const { clientWidth: w, clientHeight: h } = host
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // Pull the camera back on narrow frames so the whole model stays in view.
      camera.zoom = Math.min(1, w / h / 1.2)
      camera.updateProjectionMatrix()
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(host)

    // Pointer and scroll feed a target angle; the model eases toward it every frame.
    const aim = { x: 0, y: 0, scroll: 0 }
    const onPointer = (e) => {
      aim.x = e.clientX / window.innerWidth - 0.5
      aim.y = e.clientY / window.innerHeight - 0.5
    }
    const onScroll = () => { aim.scroll = Math.min(1, window.scrollY / (window.innerHeight || 1)) }
    if (finePointer()) window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    // Rise out of the ground, one volume after another.
    if (!still) {
      blocks.forEach((b, i) => gsap.from(b.scale, { y: 0.001, duration: 1.4, delay: 0.25 + i * 0.09, ease: 'expo.out' }))
      floaters.forEach((f, i) => gsap.from(f.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1.2, delay: 1 + i * 0.12, ease: 'back.out(2)' }))
    }

    let visible = true
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    io.observe(host)

    const clock = new THREE.Clock()
    let spin = 0.6
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible) return
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.elapsedTime
      if (!still) spin += dt * 0.12
      const ry = spin + aim.x * 0.6 + aim.scroll * 1.2
      const rx = aim.y * 0.12
      model.rotation.y += (ry - model.rotation.y) * 0.06
      model.rotation.x += (rx - model.rotation.x) * 0.06
      model.position.y += (-aim.scroll * 1.2 - model.position.y) * 0.08
      floaters.forEach(f => {
        f.position.y = f.userData.base + (still ? 0 : Math.sin(t * 1.1 + f.userData.phase) * 0.25) - aim.scroll * 1.6
        if (!still) { f.rotation.x = t * 0.6 + f.userData.phase; f.rotation.y = t * 0.4 }
      })
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', onScroll)
      blocks.concat(floaters).forEach(m => gsap.killTweensOf(m.scale))
      disposables.forEach(d => d.dispose())
      ground.geometry.dispose()
      ground.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onUnavailable])

  return <div ref={mount} className={styles.stage} aria-hidden="true" />
}
