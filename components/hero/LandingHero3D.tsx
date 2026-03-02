'use client';

import { useEffect, useMemo, useState } from 'react';

import { HeroOverlay } from '@/components/hero/HeroOverlay';
import { HeroSceneCanvas } from '@/components/hero/HeroSceneCanvas';
import { getMockAvatarProfiles } from '@/lib/hero/avatarData';
import { generateSphereNodes } from '@/lib/hero/sphereDistribution';
import { useDeviceTier } from '@/lib/hero/useDeviceTier';
import { useReducedMotionPreference } from '@/lib/hero/useReducedMotion';

interface LandingHero3DProps {
  headline: string;
  subtext: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
  };
}

function detectWebGLSupport(): boolean {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
}

export function LandingHero3D({ headline, subtext, primaryCta, secondaryCta }: LandingHero3DProps): JSX.Element {
  const deviceTier = useDeviceTier();
  const reducedMotion = useReducedMotionPreference();
  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    setWebglReady(detectWebGLSupport());
  }, []);

  const avatarCount = deviceTier === 'mobile' ? 90 : 220;

  const profiles = useMemo(() => getMockAvatarProfiles(avatarCount), [avatarCount]);

  const nodes = useMemo(
    () =>
      generateSphereNodes(profiles, {
        radius: deviceTier === 'mobile' ? 2.0 : 2.55,
        jitter: deviceTier === 'mobile' ? 0.065 : 0.095,
        minScale: deviceTier === 'mobile' ? 0.09 : 0.1,
        maxScale: deviceTier === 'mobile' ? 0.19 : 0.24
      }),
    [deviceTier, profiles]
  );

  return (
    <section className="hero-noise hero-vignette relative min-h-[100svh] overflow-hidden bg-hero-grad" aria-label="MistralFluence immersive hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(98,187,255,0.11),transparent_53%)]" />
      {webglReady ? (
        <HeroSceneCanvas
          nodes={nodes}
          reducedMotion={reducedMotion}
          deviceTier={deviceTier}
          mode="sphere"
          spreadProgress={0}
          idleMode
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className="hero-fallback-sphere" aria-hidden="true" />
        </div>
      )}
      <HeroOverlay headline={headline} subtext={subtext} primaryCta={primaryCta} secondaryCta={secondaryCta} />
    </section>
  );
}
