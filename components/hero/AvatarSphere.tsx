'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { AvatarBillboard } from '@/components/hero/AvatarBillboard';
import type { DeviceTier, SpatialMode, SphereNode } from '@/lib/hero/types';

interface AvatarSphereProps {
  nodes: SphereNode[];
  reducedMotion: boolean;
  deviceTier: DeviceTier;
  mode: SpatialMode;
  spreadProgress: number;
  idleMode: boolean;
  onHoverAvatar?: (avatarId: string | null, screenX?: number, screenY?: number) => void;
}

export function AvatarSphere({
  nodes,
  reducedMotion,
  deviceTier,
  mode,
  spreadProgress,
  idleMode,
  onHoverAvatar
}: AvatarSphereProps): JSX.Element {
  const groupRef = useRef<THREE.Group | null>(null);

  const motion = useMemo(
    () => ({
      idleRotationSpeed: reducedMotion ? 0.0012 : deviceTier === 'mobile' ? 0.0019 : 0.0024,
      activeRotationSpeed: 0,
      floatAmplitude: reducedMotion ? 0.008 : deviceTier === 'mobile' ? 0.028 : 0.045,
      floatFrequency: reducedMotion ? 0.16 : 0.22
    }),
    [deviceTier, reducedMotion]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return;
    }

    const spreadDamping = 1 - THREE.MathUtils.clamp(spreadProgress * 0.84, 0, 0.84);
    const modeDamping = mode === 'network' ? 0.64 : mode === 'transition' ? 0.82 : 1;
    const speed = (idleMode ? motion.idleRotationSpeed : motion.activeRotationSpeed) * spreadDamping * modeDamping;

    groupRef.current.rotation.y += delta * speed;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.14) * (motion.floatAmplitude * 0.28);
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * motion.floatFrequency) * motion.floatAmplitude;
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node) => (
        <AvatarBillboard
          key={node.id}
          node={node}
          mode={mode}
          spreadProgress={spreadProgress}
          onHoverAvatar={onHoverAvatar}
        />
      ))}
    </group>
  );
}
