import * as THREE from 'three';

import type { AvatarProfile, SphereDistributionConfig, SphereNode } from '@/lib/hero/types';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const DEFAULT_CONFIG: SphereDistributionConfig = {
  radius: 2.7,
  jitter: 0.08,
  minScale: 0.1,
  maxScale: 0.24
};

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function computeTangent(normal: THREE.Vector3): THREE.Vector3 {
  const reference = Math.abs(normal.y) > 0.85 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3().crossVectors(reference, normal).normalize();
}

export function generateSphereNodes(
  profiles: AvatarProfile[],
  config: Partial<SphereDistributionConfig> = {}
): SphereNode[] {
  const sphereConfig = { ...DEFAULT_CONFIG, ...config };

  return profiles.map((profile, index) => {
    const sample = (index + 0.5) / profiles.length;
    const y = 1 - sample * 2;
    const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = GOLDEN_ANGLE * index;

    const rng = seededRandom(hashString(profile.id));

    const jitterX = (rng() - 0.5) * sphereConfig.jitter;
    const jitterY = (rng() - 0.5) * sphereConfig.jitter;
    const jitterZ = (rng() - 0.5) * sphereConfig.jitter;

    const x = Math.cos(angle) * horizontal + jitterX;
    const yy = y + jitterY;
    const z = Math.sin(angle) * horizontal + jitterZ;

    const length = Math.hypot(x, yy, z) || 1;

    const spherePoint = {
      x: (x / length) * sphereConfig.radius,
      y: (yy / length) * sphereConfig.radius,
      z: (z / length) * sphereConfig.radius
    };

    const normal = new THREE.Vector3(spherePoint.x, spherePoint.y, spherePoint.z).normalize();
    const tangentA = computeTangent(normal);
    const tangentB = new THREE.Vector3().crossVectors(normal, tangentA).normalize();

    const outward = sphereConfig.radius * (1.55 + rng() * 2.35);
    const lateralA = (rng() * 2 - 1) * sphereConfig.radius * 1.95;
    const lateralB = (rng() * 2 - 1) * sphereConfig.radius * 1.95;

    const networkVector = new THREE.Vector3()
      .copy(normal)
      .multiplyScalar(outward)
      .addScaledVector(tangentA, lateralA)
      .addScaledVector(tangentB, lateralB);

    const networkPoint = {
      x: networkVector.x,
      y: networkVector.y,
      z: networkVector.z
    };

    const scale = sphereConfig.minScale + (sphereConfig.maxScale - sphereConfig.minScale) * rng();

    return {
      id: profile.id,
      profile,
      spherePoint,
      networkPoint,
      scale,
      hueShift: (rng() - 0.5) * 0.15
    };
  });
}
