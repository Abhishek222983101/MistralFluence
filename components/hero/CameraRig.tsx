'use client';

import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { MathUtils } from 'three';

import type { DeviceTier } from '@/lib/hero/types';

interface CameraRigProps {
  reducedMotion: boolean;
  deviceTier: DeviceTier;
  scrollProgress?: number;
  startZ?: number;
  settleZ?: number;
  startY?: number;
  scrollZoomStrength?: number;
}

export function CameraRig({
  reducedMotion,
  deviceTier,
  scrollProgress = 0,
  startZ = 8.6,
  settleZ = 6.4,
  startY = 0.24,
  scrollZoomStrength = 0.72
}: CameraRigProps): null {
  const camera = useThree((state) => state.camera);
  const introRef = useRef({ z: reducedMotion ? settleZ : startZ, y: reducedMotion ? 0 : startY });

  const settings = useMemo(
    () => ({
      parallaxX: reducedMotion ? 0 : deviceTier === 'mobile' ? 0.08 : 0.34,
      parallaxY: reducedMotion ? 0 : deviceTier === 'mobile' ? 0.06 : 0.22
    }),
    [deviceTier, reducedMotion]
  );

  useLayoutEffect(() => {
    if (reducedMotion) {
      introRef.current = { z: settleZ, y: 0 };
      return undefined;
    }

    const timeline = gsap.timeline();
    timeline.to(introRef.current, {
      z: settleZ,
      y: 0,
      duration: 1.9,
      ease: 'power3.out'
    });

    return () => {
      timeline.kill();
    };
  }, [reducedMotion, settleZ]);

  useFrame((state) => {
    const targetX = state.pointer.x * settings.parallaxX;
    const targetY = state.pointer.y * settings.parallaxY + introRef.current.y;
    const zoomStrength = reducedMotion ? 0 : deviceTier === 'mobile' ? scrollZoomStrength * 0.45 : scrollZoomStrength;
    const clampedScroll = MathUtils.clamp(scrollProgress, 0, 1.2);
    const targetZ = introRef.current.z - clampedScroll * zoomStrength;

    camera.position.x = MathUtils.lerp(camera.position.x, targetX, 0.06);
    camera.position.y = MathUtils.lerp(camera.position.y, targetY, 0.06);
    camera.position.z = MathUtils.lerp(camera.position.z, targetZ, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
