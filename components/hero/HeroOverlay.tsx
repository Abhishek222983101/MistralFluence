'use client';

interface HeroCTA {
  label: string;
  href: string;
}

interface HeroOverlayProps {
  headline: string;
  subtext: string;
  primaryCta: HeroCTA;
  secondaryCta: HeroCTA;
}

export function HeroOverlay({ headline, subtext, primaryCta, secondaryCta }: HeroOverlayProps): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-10">
        <div className="max-w-2xl rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-panel-soft backdrop-blur-md md:p-10">
          <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            MistralFluence Engine
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.03] text-white md:text-6xl">{headline}</h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-slate-200/85 md:text-lg">{subtext}</p>

          <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
            <a
              href={primaryCta.href}
              className="inline-flex items-center justify-center rounded-full bg-brandCoral px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              {primaryCta.label}
            </a>
            <a
              href={secondaryCta.href}
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/10"
            >
              {secondaryCta.label}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
