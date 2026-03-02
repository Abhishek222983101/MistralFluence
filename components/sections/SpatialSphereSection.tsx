'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { HeroSceneCanvas } from '@/components/hero/HeroSceneCanvas';
import { getMockAvatarProfiles } from '@/lib/hero/avatarData';
import { generateSphereNodes } from '@/lib/hero/sphereDistribution';
import type { SpatialMode } from '@/lib/hero/types';
import { useDeviceTier } from '@/lib/hero/useDeviceTier';
import { useReducedMotionPreference } from '@/lib/hero/useReducedMotion';

interface HoverCardState {
  avatarId: string;
  x: number;
  y: number;
}

interface DragState {
  x: number;
  y: number;
  active: boolean;
}

function detectWebGLSupport(): boolean {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smooth(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

const UNLOCK_SCROLL_TICKS = 2;

export function SpatialSphereSection(): JSX.Element {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const revealIntentRef = useRef(0);
  const scrollReleasedRef = useRef(false);
  const unlockTicksRef = useRef(0);

  const deviceTier = useDeviceTier();
  const reducedMotion = useReducedMotionPreference();

  const [webglReady, setWebglReady] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [revealIntent, setRevealIntent] = useState(0);
  const [idleMode, setIdleMode] = useState(true);
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
  const [scrollReleased, setScrollReleased] = useState(false);
  const [showFrameHint, setShowFrameHint] = useState(true);

  useEffect(() => {
    setWebglReady(detectWebGLSupport());
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShowFrameHint(false);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    revealIntentRef.current = revealIntent;
  }, [revealIntent]);

  useEffect(() => {
    scrollReleasedRef.current = scrollReleased;
  }, [scrollReleased]);

  const setActiveThenIdle = useCallback((): void => {
    setIdleMode(false);
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      setIdleMode(true);
    }, 2200);
  }, []);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) {
      return undefined;
    }

    const updateProgress = (): void => {
      const rect = element.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const traversed = -rect.top;
      setScrollProgress(clamp(traversed / scrollable, 0, 1));
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reducedMotion) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent): void => {
      setActiveThenIdle();
      setShowFrameHint(false);

      if (scrollReleasedRef.current) {
        return;
      }

      event.preventDefault();

      const absDelta = Math.min(280, Math.abs(event.deltaY));
      const isDownward = event.deltaY > 0;
      let nextIntent = revealIntentRef.current;

      if (isDownward) {
        nextIntent = clamp(nextIntent + absDelta * 0.00125, 0, 1);
      } else {
        nextIntent = clamp(nextIntent - absDelta * 0.0008, 0, 1);
      }

      revealIntentRef.current = nextIntent;
      setRevealIntent(nextIntent);

      if (!isDownward) {
        unlockTicksRef.current = 0;
        return;
      }

      if (nextIntent < 0.995) {
        unlockTicksRef.current = 0;
        return;
      }

      unlockTicksRef.current += 1;
      if (unlockTicksRef.current >= UNLOCK_SCROLL_TICKS) {
        setScrollReleased(true);
        scrollReleasedRef.current = true;

        requestAnimationFrame(() => {
          window.scrollBy({ top: Math.max(absDelta, 120), behavior: 'auto' });
        });
      }
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      stage.removeEventListener('wheel', handleWheel);
    };
  }, [reducedMotion, setActiveThenIdle]);

  useEffect(() => {
    if (scrollProgress > 0.02) {
      return;
    }

    setRevealIntent(0);
    revealIntentRef.current = 0;
    unlockTicksRef.current = 0;
    setScrollReleased(false);
    scrollReleasedRef.current = false;
  }, [scrollProgress]);

  const handleStagePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      setShowFrameHint(false);
      dragStateRef.current = {
        active: true,
        x: event.clientX,
        y: event.clientY
      };
      setActiveThenIdle();
    },
    [setActiveThenIdle]
  );

  const handleStagePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const drag = dragStateRef.current;
      if (!drag?.active || scrollReleasedRef.current || reducedMotion) {
        return;
      }

      const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
      if (distance < 0.5) {
        return;
      }

      const nextIntent = clamp(revealIntentRef.current + distance * 0.00095, 0, 1);
      revealIntentRef.current = nextIntent;
      setRevealIntent(nextIntent);
      setActiveThenIdle();

      dragStateRef.current = {
        active: true,
        x: event.clientX,
        y: event.clientY
      };
    },
    [reducedMotion, setActiveThenIdle]
  );

  const clearDragState = useCallback((): void => {
    dragStateRef.current = null;
  }, []);

  const avatarCount = deviceTier === 'mobile' ? 140 : 300;
  const profiles = useMemo(() => getMockAvatarProfiles(avatarCount), [avatarCount]);

  const nodes = useMemo(
    () =>
      generateSphereNodes(profiles, {
        radius: deviceTier === 'mobile' ? 2.9 : 4.05,
        jitter: deviceTier === 'mobile' ? 0.035 : 0.06,
        minScale: deviceTier === 'mobile' ? 0.08 : 0.1,
        maxScale: deviceTier === 'mobile' ? 0.21 : 0.27
      }),
    [deviceTier, profiles]
  );

  const profilesById = useMemo(() => new Map(nodes.map((node) => [node.id, node.profile])), [nodes]);
  const spreadProgress = smooth(revealIntent);

  const mode: SpatialMode = spreadProgress < 0.12 ? 'sphere' : spreadProgress < 0.9 ? 'transition' : 'network';

  const hoveredProfile = hoverCard ? profilesById.get(hoverCard.avatarId) : null;

  const handleHoverAvatar = useCallback((avatarId: string | null, screenX?: number, screenY?: number): void => {
    if (!avatarId || screenX === undefined || screenY === undefined) {
      setHoverCard(null);
      return;
    }

    setHoverCard((previous) => {
      if (
        previous &&
        previous.avatarId === avatarId &&
        Math.abs(previous.x - screenX) < 1.5 &&
        Math.abs(previous.y - screenY) < 1.5
      ) {
        return previous;
      }

      return { avatarId, x: screenX, y: screenY };
    });
  }, []);

  return (
    <section id="spatial-network" className="bg-[linear-gradient(180deg,#f4efe3_0%,#ece5d8_100%)] px-4 pb-20 pt-10 md:px-8 md:pb-24">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-8 px-1">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex rounded-full border border-slate-300 bg-white/90 px-4 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              LIVE CREATOR NETWORK
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink md:text-5xl">
              Meet the influencers your agents can become.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-body text-sm leading-relaxed text-slate-600 md:text-base">
              Built from real characters and niches. Dive in to explore, then join the beta.
            </p>
          </div>
        </div>

        <section
          ref={sectionRef}
          className="relative min-h-[210svh]"
          aria-label="Interactive spatial creator sphere"
          aria-labelledby="spatial-network-heading"
        >
          <div
            ref={stageRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={clearDragState}
            onPointerLeave={clearDragState}
            onPointerCancel={clearDragState}
            className="sticky top-4 h-[94svh] overflow-hidden rounded-[2rem] border border-slate-900/12 bg-[linear-gradient(180deg,#00050d_0%,#010912_60%,#010814_100%)] shadow-[0_30px_70px_rgba(9,14,30,0.35)] md:top-6"
          >
            <div className="spatial-noise spatial-vignette absolute inset-0" />

            {webglReady ? (
              <HeroSceneCanvas
                nodes={nodes}
                reducedMotion={reducedMotion}
                deviceTier={deviceTier}
                mode={mode}
                spreadProgress={spreadProgress}
                idleMode={idleMode}
                onHoverAvatar={handleHoverAvatar}
                scrollProgress={spreadProgress}
                cameraStartZ={deviceTier === 'mobile' ? 8.4 : 9.1}
                cameraSettleZ={deviceTier === 'mobile' ? 7.7 : 8.7}
                cameraStartY={deviceTier === 'mobile' ? 0.08 : 0.12}
                scrollZoomStrength={deviceTier === 'mobile' ? 1.25 : 2.95}
                starCount={deviceTier === 'mobile' ? 620 : 1000}
                particleCount={deviceTier === 'mobile' ? 260 : 960}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <div className="hero-fallback-sphere" aria-hidden="true" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-5 z-20 px-5 md:px-8">
              <p
                id="spatial-network-heading"
                className={`font-body text-sm font-medium text-white/80 transition-opacity duration-500 ${
                  showFrameHint ? 'opacity-100' : 'opacity-0'
                }`}
              >
                Dive in. Watch the network unfold.
              </p>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 px-5 md:px-8">
              <p
                className={`text-right font-body text-sm font-medium text-emerald-200/85 transition-opacity duration-500 ${
                  scrollReleased ? 'opacity-100' : 'opacity-0'
                }`}
              >
                Continue ↓
              </p>
            </div>

            {hoverCard && hoveredProfile ? (
              <div
                className="pointer-events-none absolute z-30"
                style={{
                  left: `${hoverCard.x}px`,
                  top: `${hoverCard.y}px`,
                  transform: 'translate(-50%, calc(-100% - 12px))'
                }}
              >
                <div className="rounded-2xl bg-white px-4 py-2 text-slate-900 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
                  <p className="text-lg font-semibold leading-none tracking-tight">{hoveredProfile.handle}</p>
                  <p className="mt-1 text-xs text-slate-600">{hoveredProfile.displayName}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
