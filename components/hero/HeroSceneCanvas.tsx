'use client';

import { AdaptiveDpr, AdaptiveEvents, OrbitControls, Preload, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { AvatarSphere } from '@/components/hero/AvatarSphere';
import { DepthParticles } from '@/components/hero/DepthParticles';
import type { DeviceTier, SpatialMode, SphereNode } from '@/lib/hero/types';

const IDLE_ROTATION_DIRECTION = 'rightward' as const;

interface HeroSceneCanvasProps {
  nodes: SphereNode[];
  reducedMotion: boolean;
  deviceTier: DeviceTier;
  mode: SpatialMode;
  spreadProgress: number;
  idleMode: boolean;
  onHoverAvatar?: (avatarId: string | null, screenX?: number, screenY?: number) => void;
  scrollProgress?: number;
  cameraStartZ?: number;
  cameraSettleZ?: number;
  cameraStartY?: number;
  scrollZoomStrength?: number;
  starCount?: number;
  particleCount?: number;
  className?: string;
}

interface OrbitRigProps {
  reducedMotion: boolean;
  deviceTier: DeviceTier;
  spreadProgress: number;
  scrollProgress: number;
  idleMode: boolean;
  baseDistance: number;
  scrollZoomStrength: number;
  idleRotationDirection: typeof IDLE_ROTATION_DIRECTION;
}

function OrbitRig({
  reducedMotion,
  deviceTier,
  spreadProgress,
  scrollProgress,
  idleMode,
  baseDistance,
  scrollZoomStrength,
  idleRotationDirection
}: OrbitRigProps): JSX.Element {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const camera = useThree((state) => state.camera);
  const targetRef = useRef(new THREE.Vector3());
  const directionRef = useRef(new THREE.Vector3());
  const focusRef = useRef(new THREE.Vector3());

  const minDistance = deviceTier === 'mobile' ? 5.8 : 7;
  const maxDistance = deviceTier === 'mobile' ? 11.2 : 13.5;
  const idleRotateSpeedMagnitude = deviceTier === 'mobile' ? 0.2 : 0.26;
  const idleRotateSpeed = idleRotationDirection === 'rightward' ? idleRotateSpeedMagnitude : -idleRotateSpeedMagnitude;

  useFrame((state) => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    const spreadZoom = reducedMotion ? 0 : spreadProgress * scrollZoomStrength * 0.55;
    const scrollZoom = reducedMotion ? 0 : scrollProgress * (deviceTier === 'mobile' ? 0.45 : 0.7);
    const desiredDistance = THREE.MathUtils.clamp(baseDistance - spreadZoom - scrollZoom, minDistance, maxDistance);

    directionRef.current.copy(camera.position).sub(controls.target).normalize();
    targetRef.current.copy(directionRef.current).multiplyScalar(desiredDistance).add(controls.target);
    camera.position.lerp(targetRef.current, 0.055);

    if (reducedMotion) {
      controls.target.lerp(focusRef.current.set(0, 0, 0), 0.08);
    } else {
      focusRef.current.set(
        state.pointer.x * (deviceTier === 'mobile' ? 0.08 : 0.15),
        state.pointer.y * (deviceTier === 'mobile' ? 0.05 : 0.1),
        0
      );
      controls.target.lerp(focusRef.current, 0.06);
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableZoom={!reducedMotion}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.35}
      zoomSpeed={0.5}
      minDistance={minDistance}
      maxDistance={maxDistance}
      autoRotate={!reducedMotion && idleMode}
      autoRotateSpeed={idleRotateSpeed}
      minPolarAngle={Math.PI * 0.25}
      maxPolarAngle={Math.PI * 0.74}
    />
  );
}

export function HeroSceneCanvas({
  nodes,
  reducedMotion,
  deviceTier,
  mode,
  spreadProgress,
  idleMode,
  onHoverAvatar,
  scrollProgress = 0,
  cameraSettleZ = 8.8,
  scrollZoomStrength = 1,
  starCount,
  particleCount,
  className = 'absolute inset-0'
}: HeroSceneCanvasProps): JSX.Element {
  const resolvedStarCount = starCount ?? (deviceTier === 'mobile' ? 560 : 940);
  const resolvedParticleCount = particleCount ?? (deviceTier === 'mobile' ? 240 : 880);

  return (
    <Canvas
      className={className}
      dpr={[1, deviceTier === 'mobile' ? 1.3 : 1.75]}
      camera={{ position: [0, 0.2, cameraSettleZ], fov: 43, near: 0.1, far: 130 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => onHoverAvatar?.(null)}
    >
      <Suspense fallback={null}>
        <color attach="background" args={['#000309']} />
        <fog attach="fog" args={['#000309', 8, 28]} />

        <ambientLight intensity={0.74} />
        <directionalLight position={[3.8, 2.5, 4.8]} intensity={0.92} color="#d4ebff" />
        <pointLight position={[-3.2, -1.5, 4.5]} intensity={0.42} color="#8f63ff" />

        <Stars radius={90} depth={50} count={resolvedStarCount} factor={3.1} saturation={0} fade speed={0.14} />
        <DepthParticles
          count={resolvedParticleCount}
          radius={4.9}
          reducedMotion={reducedMotion}
          deviceTier={deviceTier}
          mode={mode}
          spreadProgress={spreadProgress}
        />

        <AvatarSphere
          nodes={nodes}
          reducedMotion={reducedMotion}
          deviceTier={deviceTier}
          mode={mode}
          spreadProgress={spreadProgress}
          idleMode={idleMode}
          onHoverAvatar={onHoverAvatar}
        />

        <OrbitRig
          reducedMotion={reducedMotion}
          deviceTier={deviceTier}
          spreadProgress={spreadProgress}
          scrollProgress={scrollProgress}
          idleMode={idleMode}
          baseDistance={cameraSettleZ}
          scrollZoomStrength={scrollZoomStrength}
          idleRotationDirection={IDLE_ROTATION_DIRECTION}
        />

        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
