'use client';

import { Billboard, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import type { SpatialMode, SphereNode } from '@/lib/hero/types';

interface AvatarBillboardProps {
  node: SphereNode;
  mode: SpatialMode;
  spreadProgress: number;
  onHoverAvatar?: (avatarId: string | null, screenX?: number, screenY?: number) => void;
}

function ease(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

export function AvatarBillboard({
  node,
  mode,
  spreadProgress,
  onHoverAvatar
}: AvatarBillboardProps): JSX.Element {
  const groupRef = useRef<THREE.Group | null>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useTexture(node.profile.imageUrl);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
  }, [texture]);

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return;
    }

    const transition = ease(THREE.MathUtils.clamp(spreadProgress, 0, 1));
    const targetX = THREE.MathUtils.lerp(node.spherePoint.x, node.networkPoint.x, transition);
    const targetY = THREE.MathUtils.lerp(node.spherePoint.y, node.networkPoint.y, transition);
    const targetZ = THREE.MathUtils.lerp(node.spherePoint.z, node.networkPoint.z, transition);

    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, Math.min(1, delta * 6));
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, Math.min(1, delta * 6));
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, Math.min(1, delta * 6));
  });

  const modeBoost = mode === 'sphere' ? 1.03 : mode === 'transition' ? 1.015 : 1;
  const radius = node.scale * modeBoost;

  return (
    <group ref={groupRef} position={[node.spherePoint.x, node.spherePoint.y, node.spherePoint.z]}>
      <Billboard follow>
        <group>
          <mesh
            position={[0, 0, 0.03]}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHovered(true);
              onHoverAvatar?.(node.id, event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (hovered) {
                onHoverAvatar?.(node.id, event.clientX, event.clientY);
              }
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              setHovered(true);
              onHoverAvatar?.(node.id, event.clientX, event.clientY);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              setHovered(false);
              onHoverAvatar?.(null);
            }}
          >
            <circleGeometry args={[radius * (hovered ? 1.08 : 1), 44]} />
            <meshBasicMaterial map={texture} toneMapped={false} transparent depthWrite={false} />
          </mesh>

          <mesh position={[0, 0, 0.02]}>
            <ringGeometry args={[radius * 1.03, radius * 1.13, 44]} />
            <meshBasicMaterial
              color="#eff6ff"
              transparent
              opacity={hovered ? 0.94 : 0.62}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>

          <mesh position={[0, 0, 0]}>
            <circleGeometry args={[radius * 1.3, 40]} />
            <meshBasicMaterial
              color={new THREE.Color(node.profile.accent).offsetHSL(node.hueShift, 0, 0)}
              transparent
              opacity={hovered ? 0.22 : 0.1}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}
