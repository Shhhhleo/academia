"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, extend, useFrame, type ThreeElement } from "@react-three/fiber"
import { shaderMaterial } from "@react-three/drei"
import * as THREE from "three"
import { cn } from "@/lib/utils"

// Flowing noise field mixed between two colours, with film grain on top.
const WaveShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorA: new THREE.Color("#ffffff"),
    uColorB: new THREE.Color("#000000"),
    uGlow: 0.15,
    uMouse: new THREE.Vector2(0.5, 0.5),
    uResolution: new THREE.Vector2(1, 1),
  },
  // Vertex shader
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uGlow;
    uniform vec2 uMouse;
    uniform vec2 uResolution;

    varying vec2 vUv;
    varying vec3 vPosition;

    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    // Fractal noise for more complex texture
    float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    // Smooth interpolation
    float smoothNoise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 st = vUv;

      // Create flowing waves
      float wave1 = sin(st.x * 8.0 + uTime * 2.0) * 0.1;
      float wave2 = sin(st.y * 6.0 + uTime * 1.5) * 0.1;
      float wave3 = sin((st.x + st.y) * 4.0 + uTime * 3.0) * 0.05;

      // Add mouse interaction
      vec2 mouseInfluence = (uMouse - 0.5) * 0.3;
      st += mouseInfluence;

      float waves = wave1 + wave2 + wave3;
      float noiseValue = smoothNoise(st * 3.0 + uTime * 0.5);
      float fbmNoise = fbm(st * 2.0 + uTime * 0.3);
      float combinedNoise = mix(noiseValue, fbmNoise, 0.6);

      float mixFactor = (waves + combinedNoise + 1.0) * 0.5;
      mixFactor = smoothstep(0.2, 0.8, mixFactor);
      vec3 color = mix(uColorA, uColorB, mixFactor);

      float glow = 1.0 - distance(st, vec2(0.5)) * 1.2;
      glow = smoothstep(0.0, 1.0, glow);
      glow += combinedNoise * 0.2;
      color += glow * uGlow;

      float brightness = 0.9 + sin(uTime * 0.8) * 0.1;
      color *= brightness;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
)

extend({ WaveShaderMaterial })

type WaveShaderMaterialImpl = InstanceType<typeof WaveShaderMaterial> & {
  uTime: number
  uColorA: THREE.Color
  uColorB: THREE.Color
  uGlow: number
  uMouse: THREE.Vector2
  uResolution: THREE.Vector2
}

declare module "@react-three/fiber" {
  interface ThreeElements {
    waveShaderMaterial: ThreeElement<typeof WaveShaderMaterial>
  }
}

interface ShaderPlaneProps {
  colorA: string
  colorB: string
  glow: number
  speed: number
}

function ShaderPlane({ colorA, colorB, glow, speed }: ShaderPlaneProps) {
  const materialRef = useRef<WaveShaderMaterialImpl>(null)
  const mouse = useRef({ x: 0.5, y: 0.5 })
  const target = useRef(new THREE.Vector2(0.5, 0.5))

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = event.clientX / window.innerWidth
      mouse.current.y = 1 - event.clientY / window.innerHeight
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    const m = materialRef.current
    if (!m) return
    m.uColorA.set(colorA)
    m.uColorB.set(colorB)
    m.uGlow = glow
  }, [colorA, colorB, glow])

  useFrame((state) => {
    const m = materialRef.current
    if (!m) return
    m.uTime = state.clock.elapsedTime * speed
    target.current.set(mouse.current.x, mouse.current.y)
    m.uMouse.lerp(target.current, 0.05)
    m.uResolution.set(state.size.width, state.size.height)
  })

  return (
    <mesh scale={[4, 4, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <waveShaderMaterial ref={materialRef} key={WaveShaderMaterial.key} />
    </mesh>
  )
}

export interface PolishedShaderProps {
  className?: string
  /** First colour of the noise field. */
  colorA?: string
  /** Second colour of the noise field. */
  colorB?: string
  /** Additive centre glow, 0–0.3. */
  glow?: number
  /** Animation speed multiplier. */
  speed?: number
  /** Film-grain overlay opacity (0 disables it). */
  grain?: number
}

/**
 * Full-bleed animated background. Sizes to its parent, pauses when off-screen,
 * and renders a single still frame when the user prefers reduced motion.
 */
export default function PolishedShader({
  className,
  colorA = "#ffffff",
  colorB = "#000000",
  glow = 0.15,
  speed = 1,
  grain = 0.2,
}: PolishedShaderProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduceMotion(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const frameloop = !visible ? "never" : reduceMotion ? "demand" : "always"

  return (
    <div ref={wrapRef} aria-hidden="true" className={cn("absolute inset-0 overflow-hidden", className)}>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 75 }}
        dpr={[1, 1.5]}
        frameloop={frameloop}
        gl={{ antialias: false, powerPreference: "low-power" }}
        className="absolute! inset-0"
      >
        <ShaderPlane colorA={colorA} colorB={colorB} glow={glow} speed={speed} />
      </Canvas>
      {grain > 0 && (
        <div
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            opacity: grain,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: "256px 256px",
          }}
        />
      )}
    </div>
  )
}
