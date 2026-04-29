'use client'

import { Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import {
  Float,
  RoundedBox,
  useTexture,
} from '@react-three/drei'
import * as THREE from 'three'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  buildPicturesImageUrl,
  buildUploadImageUrl,
  isPicturesSource,
  isUploadsSource,
} from '@/lib/image-service'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface GalleryImage {
  id: string
  src: string
  date: string
  title: string
}

interface PictureFrameProps {
  image: GalleryImage
  baseAngle: number
  radius: number
  baseY: number
  scale: number
  isActive: boolean
  onClick: (event: ThreeEvent<MouseEvent>) => void
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
  rotationController: React.MutableRefObject<{ current: number; target: number }>
}

type OrbitControlsHandle = {
  target: THREE.Vector3
  update: () => void
  dispose: () => void
}

function resolveGalleryTextureSrc(src: string): string {
  if (isUploadsSource(src)) return buildUploadImageUrl(src)
  if (!isPicturesSource(src)) return src
  return buildPicturesImageUrl(src, {
    width: 768,
    height: 1024,
    quality: 72,
    fit: 'cover',
    format: 'webp',
  })
}

function resolveGalleryDetailSrc(src: string): string {
  if (isUploadsSource(src)) return buildUploadImageUrl(src)
  if (!isPicturesSource(src)) return src
  return buildPicturesImageUrl(src, {
    width: 1600,
    height: 1200,
    quality: 82,
    fit: 'inside',
    format: 'webp',
  })
}

function formatDateLabel(date: string): string {
  if (!date) return '未标注日期 / Undated'

  const normalized = date.replace(/\./g, '-').replace(/\//g, '-')
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return `${date} / ${date}`

  const zh = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed)

  const en = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)

  return `${zh} / ${en}`
}

function buildPositions(images: GalleryImage[]) {
  return images.map((_, i) => {
    const angle = (i / Math.max(images.length, 1)) * Math.PI * 2
    const radius = 8.2 + Math.sin(i * 0.85) * 1.1
    const y = Math.sin(angle * 1.45) * 1.6 + Math.cos(i * 0.45) * 0.5

    return {
      angle,
      radius,
      y,
      scale: 0.9 + (i % 4) * 0.04,
    }
  })
}

function PictureFrame({
  image,
  baseAngle,
  radius,
  baseY,
  scale,
  isActive,
  onClick,
  hoveredId,
  setHoveredId,
  rotationController,
}: PictureFrameProps) {
  const groupRef = useRef<THREE.Group>(null)
  const plateRef = useRef<THREE.Mesh>(null)
  const textureSrc = resolveGalleryTextureSrc(image.src)
  const texture = useTexture(textureSrc)
  const isHovered = hoveredId === image.id

  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  useFrame((state) => {
    if (!groupRef.current || !plateRef.current) return

    const orbitAngle = baseAngle + rotationController.current.current
    const x = Math.cos(orbitAngle) * radius
    const z = Math.sin(orbitAngle) * radius
    const rotY = -orbitAngle + Math.PI / 2
    const hoverLift = isHovered || isActive ? 0.38 : 0
    const targetY = baseY + hoverLift
    const wobble = Math.sin(state.clock.elapsedTime * 0.7 + x) * 0.03

    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x, 0.08)
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY + wobble, 0.08)
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, z, 0.08)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      rotY + (isHovered ? 0.08 : 0),
      0.08
    )

    plateRef.current.position.z = THREE.MathUtils.lerp(
      plateRef.current.position.z,
      isHovered || isActive ? 0.16 : 0.145,
      0.12
    )
  })

  return (
    <group ref={groupRef} position={[Math.cos(baseAngle) * radius, baseY, Math.sin(baseAngle) * radius]} rotation={[0, -baseAngle + Math.PI / 2, 0]} scale={scale}>
      <Float speed={1.7} rotationIntensity={0.14} floatIntensity={0.18}>
        <group
          onClick={onClick}
          onPointerEnter={(event) => {
            event.stopPropagation()
            setHoveredId(image.id)
          }}
          onPointerLeave={(event) => {
            event.stopPropagation()
            setHoveredId(null)
          }}
        >
          <RoundedBox args={[3.45, 4.55, 0.22]} radius={0.08} smoothness={5}>
            <meshStandardMaterial
              color={isActive ? '#4a3b27' : '#2a221d'}
              roughness={0.72}
              metalness={0.18}
            />
          </RoundedBox>

          <mesh position={[0, 0, 0.09]}>
            <planeGeometry args={[3.06, 4.16]} />
            <meshStandardMaterial color="#f4efe6" roughness={0.92} metalness={0.02} />
          </mesh>

          <mesh ref={plateRef} position={[0, 0, 0.145]}>
            <planeGeometry args={[2.76, 3.82]} />
            <meshStandardMaterial
              map={texture}
              toneMapped={false}
              roughness={0.94}
              metalness={0.02}
            />
          </mesh>

          <mesh position={[0, -2.62, 0.03]}>
            <planeGeometry args={[2.3, 0.32]} />
            <meshStandardMaterial
              color={isHovered || isActive ? '#b08a55' : '#8d7450'}
              roughness={0.5}
              metalness={0.48}
            />
          </mesh>

        </group>
      </Float>
    </group>
  )
}

function Stars() {
  const count = 320
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      values[i * 3] = (Math.random() - 0.5) * 80
      values[i * 3 + 1] = (Math.random() - 0.5) * 40
      values[i * 3 + 2] = (Math.random() - 0.5) * 80
    }
    return values
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#f2dcc0" transparent opacity={0.45} sizeAttenuation />
    </points>
  )
}

function GalleryFloor() {
  return (
    <group position={[0, -3.15, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <circleGeometry args={[14.5, 120]} />
        <meshStandardMaterial color="#15100d" roughness={0.98} metalness={0.03} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]}>
        <circleGeometry args={[10.6, 120]} />
        <meshStandardMaterial color="#1d1613" roughness={0.9} metalness={0.06} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <circleGeometry args={[8.2, 120]} />
        <meshBasicMaterial color="#e8c99d" transparent opacity={0.085} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[5.1, 5.7, 120]} />
        <meshBasicMaterial color="#f1d7af" transparent opacity={0.22} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
        <ringGeometry args={[8.8, 9.05, 120]} />
        <meshBasicMaterial color="#b58e5d" transparent opacity={0.145} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[2.15, 96]} />
        <meshBasicMaterial color="#f6dfbd" transparent opacity={0.12} />
      </mesh>
    </group>
  )
}

function CameraRig({
  activeIndex,
  positions,
  controlsRef,
}: {
  activeIndex: number | null
  positions: Array<{ angle: number; radius: number; y: number; scale: number }>
  controlsRef: React.RefObject<OrbitControlsHandle | null>
}) {
  const { camera } = useThree()
  const targetPositionRef = useRef(new THREE.Vector3(0, 2.1, 17.8))
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0, 0))
  const isAnimatingRef = useRef(false)

  useEffect(() => {
    const controls = controlsRef.current as OrbitControlsHandle | null
    if (activeIndex === null) {
      targetPositionRef.current = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
      targetLookAtRef.current = controls?.target.clone() ?? new THREE.Vector3(0, 0, 0)
      isAnimatingRef.current = false
      return
    }

    // Clicking a frame should open the preview without pulling the whole camera forward.
    targetPositionRef.current = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
    targetLookAtRef.current = controls?.target.clone() ?? new THREE.Vector3(0, 0, 0)
    isAnimatingRef.current = false
  }, [activeIndex, camera.position.x, camera.position.y, camera.position.z, controlsRef, positions])

  useFrame(() => {
    if (!isAnimatingRef.current) return

    camera.position.lerp(targetPositionRef.current, 0.08)

    const controls = controlsRef.current as OrbitControlsHandle | null
    if (controls) {
      controls.target.lerp(targetLookAtRef.current, 0.08)
      controls.update()
    } else {
      camera.lookAt(targetLookAtRef.current)
    }

    if (
      camera.position.distanceTo(targetPositionRef.current) < 0.04 &&
      (!controls || controls.target.distanceTo(targetLookAtRef.current) < 0.04)
    ) {
      camera.position.copy(targetPositionRef.current)
      if (controls) {
        controls.target.copy(targetLookAtRef.current)
        controls.update()
      } else {
        camera.lookAt(targetLookAtRef.current)
      }
      isAnimatingRef.current = false
      return
    }
  })

  return null
}

function Gallery3D({
  images,
  activeIndex,
  onImageClick,
  rotationController,
}: {
  images: GalleryImage[]
  activeIndex: number | null
  onImageClick: (index: number) => void
  rotationController: React.MutableRefObject<{ current: number; target: number }>
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const positions = useMemo(() => buildPositions(images), [images])
  const controlsRef = useRef<OrbitControlsHandle | null>(null)

  useFrame(() => {
    rotationController.current.current = THREE.MathUtils.lerp(
      rotationController.current.current,
      rotationController.current.target,
      0.08
    )
  })

  return (
    <>
      <color attach="background" args={['#17120f']} />
      <fog attach="fog" args={['#17120f', 14, 34]} />
      <ambientLight intensity={1.32} color="#f9efe2" />
      <directionalLight position={[5, 8, 6]} intensity={2.8} color="#fff4e2" />
      <pointLight position={[-8, -2, -6]} intensity={1.55} color="#8198b4" />
      <pointLight position={[7, 2, -4]} intensity={1.82} color="#dda45f" />
      <spotLight
        position={[0, 9, 2]}
        angle={0.52}
        penumbra={0.55}
        intensity={34}
        distance={34}
        color="#f4dcba"
      />
      <Stars />
      <GalleryFloor />

      {images.map((image, i) => (
        <PictureFrame
          key={image.id}
          image={image}
          baseAngle={positions[i].angle}
          radius={positions[i].radius}
          baseY={positions[i].y}
          scale={positions[i].scale}
          isActive={activeIndex === i}
          onClick={(event) => {
            event.stopPropagation()
            onImageClick(i)
          }}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          rotationController={rotationController}
        />
      ))}

      <CameraRig activeIndex={activeIndex} positions={positions} controlsRef={controlsRef} />
      <GalleryOrbitControls controlsRef={controlsRef} />
    </>
  )
}

function GalleryOrbitControls({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsHandle | null>
}) {
  const { camera, gl } = useThree()

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement)
    controls.enablePan = false
    controls.enableZoom = false
    controls.minPolarAngle = 0.18
    controls.maxPolarAngle = Math.PI - 0.18
    controls.rotateSpeed = 0.45
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controlsRef.current = controls

    return () => {
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, gl, controlsRef])

  useFrame(() => {
    controlsRef.current?.update()
  })

  return null
}

interface GalleryOverlayProps {
  count: number
  activeImage: GalleryImage | null
}

function GalleryOverlay({ count, activeImage }: GalleryOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden px-4 pb-5 pt-20 sm:px-6 sm:pb-6 sm:pt-24 md:pl-32 md:pr-8 md:pt-10 lg:px-10 lg:pb-8 lg:pt-10 xl:pl-36">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(231,196,147,0.24),transparent_34%),linear-gradient(180deg,rgba(8,7,6,0.12),rgba(8,7,6,0.42)_58%,rgba(8,7,6,0.64))]" />

      <motion.div
        className="pointer-events-auto relative flex max-w-3xl flex-col gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-fit rounded-full border border-white/12 bg-black/18 px-4 py-2 backdrop-blur-md">
          <p className="text-[0.68rem] uppercase tracking-[0.34em] text-[#d8c2a3]/85">
            立体影像展 / 3D Picture Gallery
          </p>
        </div>

        <div className="max-w-2xl">
          <h1
            className="text-[clamp(2.2rem,5.6vw,4.45rem)] leading-[0.96] tracking-[0.01em] text-[#f8efdf]"
            style={{ fontFamily: 'var(--pictures-font-serif), var(--font-blog), serif' }}
          >
            <span className="inline-block border-b border-[#d7be97]/28 pb-2 pr-2">
              漂浮画框
            </span>
            <span
              className="mt-3 block text-[clamp(0.82rem,1.5vw,1.1rem)] font-normal uppercase tracking-[0.22em] text-[#cdb38e]"
              style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
            >
              Floating Frames
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#eadfcf]/78 sm:text-base">
            把图片放进一个更安静的 3D 展陈里。
            <br />
            Place each image in a calmer 3D exhibition space.
          </p>
        </div>
      </motion.div>

      <div className="pointer-events-auto relative mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <div className="rounded-[1.6rem] border border-white/12 bg-black/28 p-4 backdrop-blur-md sm:p-5">
            <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#cdb89a]/72">
              数量 / Frames
            </p>
            <p className="mt-3 text-3xl tracking-[-0.04em] text-[#fff6e7]">{count}</p>
          </div>
          <div className="rounded-[1.6rem] border border-white/12 bg-black/28 p-4 backdrop-blur-md sm:p-5">
            <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#cdb89a]/72">
              交互 / Interaction
            </p>
            <p className="mt-3 text-base leading-6 text-[#fff0da]">
              滚轮或拖动旋转，点击查看
              <br />
              Scroll or drag to orbit, click to open
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-white/12 bg-black/28 p-4 backdrop-blur-md sm:p-5">
            <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#cdb89a]/72">
              质感 / Mood
            </p>
            <p className="mt-3 text-base leading-6 text-[#fff0da]">
              纸面、木框、暖光
              <br />
              Paper, wood, warm light
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[1.8rem] border border-white/12 bg-black/34 p-5 backdrop-blur-md sm:p-6"
        >
          <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#cdb89a]/72">
            当前焦点 / Current Focus
          </p>
          <p
            className="mt-3 text-[1.7rem] leading-[1.02] tracking-[-0.05em] text-[#fff7ea]"
            style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
          >
            {activeImage?.title ?? '点击任意画框'}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#eadfcf]/76">
            {activeImage
              ? formatDateLabel(activeImage.date)
              : '查看单张大图与日期信息 / Open a frame to see the large preview and date.'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

interface ActivePreviewProps {
  image: GalleryImage
  onClose: () => void
}

function ActivePreview({ image, onClose }: ActivePreviewProps) {
  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-[rgba(10,8,6,0.78)] px-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="grid w-full max-w-6xl gap-4 overflow-hidden rounded-[2rem] border border-white/10 bg-[#17120f]/92 p-3 shadow-[0_30px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[minmax(0,1.35fr)_320px] lg:p-4"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[#0f0c0a]">
          <Image
            src={resolveGalleryDetailSrc(image.src)}
            alt={image.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
            unoptimized={image.src.startsWith('http')}
          />
        </div>

        <div className="flex flex-col justify-between gap-6 rounded-[1.5rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-5 sm:p-6">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[#d0b692]/72">
              单图预览 / Focus View
            </p>
            <h2
              className="mt-4 text-[2rem] leading-[0.95] tracking-[-0.05em] text-[#fff8ee]"
              style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
            >
              {image.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#eadfcd]/78">{formatDateLabel(image.date)}</p>
          </div>

          <div className="grid gap-3 text-sm text-[#f4e7d3]">
            <div className="rounded-[1.2rem] bg-[rgba(255,255,255,0.04)] p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#c7ab84]/72">
                观看提示 / Tip
              </p>
              <p className="mt-2 leading-6">
                再点空白处即可关闭。
                <br />
                Click the dark area to close.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/12 px-4 py-3 text-left text-sm text-[#fff1dc] transition-colors duration-200 hover:bg-white/6"
            >
              关闭预览 / Close Preview
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface Picture3DGalleryProps {
  images: GalleryImage[]
  className?: string
}

export default function Picture3DGallery({ images, className }: Picture3DGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const rotationController = useRef({ current: 0, target: 0 })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const element = galleryRef.current
    if (!element) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      rotationController.current.target += event.deltaY * 0.0018
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [])

  const activeImage = activeIndex === null ? null : images[activeIndex]

  return (
    <motion.div
      ref={galleryRef}
      className={cn(
        'relative h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,#493524_0%,#211814_36%,#120d0b_100%)]',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(223,174,108,0.24),transparent_28%),radial-gradient(circle_at_80%_22%,rgba(98,126,160,0.18),transparent_24%)]" />

      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 2.1, 17.8], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.8]}
          className="absolute inset-0"
        >
          <Gallery3D
            images={images}
            activeIndex={activeIndex}
            onImageClick={setActiveIndex}
            rotationController={rotationController}
          />
        </Canvas>
      </Suspense>

      <GalleryOverlay count={images.length} activeImage={activeImage} />

      <AnimatePresence>{activeImage ? <ActivePreview image={activeImage} onClose={() => setActiveIndex(null)} /> : null}</AnimatePresence>
    </motion.div>
  )
}
