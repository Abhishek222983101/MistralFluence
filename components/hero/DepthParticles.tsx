'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { DeviceTier, SpatialMode } from '@/lib/hero/types';

interface DepthParticlesProps {
  count: number;
  radius: number;
  reducedMotion: boolean;
  deviceTier: DeviceTier;
  mode: SpatialMode;
  spreadProgress: number;
}

const PALETTE = ['#2ac2ff', '#8d4dff', '#2ec6ff', '#9658ff', '#ff972f'];

let dotTexture: THREE.CanvasTexture | null = null;

function getDotTexture(): THREE.CanvasTexture {
  if (dotTexture) {
    return dotTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create particle texture');
  }

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.58, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  dotTexture = new THREE.CanvasTexture(canvas);
  dotTexture.needsUpdate = true;
  dotTexture.minFilter = THREE.LinearFilter;
  dotTexture.magFilter = THREE.LinearFilter;

  return dotTexture;
}

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function smooth(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

function computeTangent(normal: THREE.Vector3): THREE.Vector3 {
  const reference = Math.abs(normal.y) > 0.85 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3().crossVectors(reference, normal).normalize();
}

export function DepthParticles({
  count,
  radius,
  reducedMotion,
  deviceTier,
  mode,
  spreadProgress
}: DepthParticlesProps): JSX.Element {
  const pointsRef = useRef<THREE.Points | null>(null);
  const positionRef = useRef<THREE.BufferAttribute | null>(null);

  const dotMap = useMemo(() => getDotTexture(), []);

  const { spherePositions, networkPositions, currentPositions, colors } = useMemo(() => {
    const rng = seededRandom(42_4242 + count * 17);
    const sphereBuffer = new Float32Array(count * 3);
    const networkBuffer = new Float32Array(count * 3);
    const currentBuffer = new Float32Array(count * 3);
    const colorsBuffer = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const sample = (index + 0.5) / count;
      const y = 1 - sample * 2;
      const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      const shell = radius + (rng() - 0.5) * 1.1;

      const nx = Math.cos(angle) * horizontal;
      const ny = y;
      const nz = Math.sin(angle) * horizontal;

      sphereBuffer[index * 3] = nx * shell;
      sphereBuffer[index * 3 + 1] = ny * shell;
      sphereBuffer[index * 3 + 2] = nz * shell;

      currentBuffer[index * 3] = sphereBuffer[index * 3];
      currentBuffer[index * 3 + 1] = sphereBuffer[index * 3 + 1];
      currentBuffer[index * 3 + 2] = sphereBuffer[index * 3 + 2];

      const normal = new THREE.Vector3(nx, ny, nz).normalize();
      const tangentA = computeTangent(normal);
      const tangentB = new THREE.Vector3().crossVectors(normal, tangentA).normalize();

      const spreadDepth = radius * (1.7 + rng() * 2.4);
      const lateralA = (rng() * 2 - 1) * radius * 2.2;
      const lateralB = (rng() * 2 - 1) * radius * 2.2;

      const network = new THREE.Vector3()
        .copy(normal)
        .multiplyScalar(spreadDepth)
        .addScaledVector(tangentA, lateralA)
        .addScaledVector(tangentB, lateralB);

      networkBuffer[index * 3] = network.x;
      networkBuffer[index * 3 + 1] = network.y;
      networkBuffer[index * 3 + 2] = network.z;

      const paletteIndex = index % 18 === 0 ? 4 : index % 2;
      const color = new THREE.Color(PALETTE[paletteIndex]);
      colorsBuffer[index * 3] = color.r;
      colorsBuffer[index * 3 + 1] = color.g;
      colorsBuffer[index * 3 + 2] = color.b;
    }

    return {
      spherePositions: sphereBuffer,
      networkPositions: networkBuffer,
      currentPositions: currentBuffer,
      colors: colorsBuffer
    };
  }, [count, radius]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !positionRef.current) {
      return;
    }

    const transition = smooth(THREE.MathUtils.clamp(spreadProgress, 0, 1));

    for (let i = 0; i < count * 3; i += 1) {
      const target = THREE.MathUtils.lerp(spherePositions[i], networkPositions[i], transition);
      currentPositions[i] = THREE.MathUtils.lerp(currentPositions[i], target, Math.min(1, delta * 5.2));
    }

    positionRef.current.needsUpdate = true;

    const baseSpeed = reducedMotion ? 0.0015 : deviceTier === 'mobile' ? 0.0025 : 0.0036;
    const speed = mode === 'sphere' ? baseSpeed : baseSpeed * 0.68;
    pointsRef.current.rotation.y += delta * speed;
    pointsRef.current.rotation.x += delta * (speed * 0.34);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[currentPositions, 3]}
          ref={(attribute) => {
            positionRef.current = attribute;
          }}
        />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={deviceTier === 'mobile' ? 0.034 : 0.041}
        sizeAttenuation
        transparent
        opacity={mode === 'sphere' ? 0.9 : 0.84}
        vertexColors
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={dotMap}
        alphaMap={dotMap}
        alphaTest={0.04}
      />
    </points>
  );
}
