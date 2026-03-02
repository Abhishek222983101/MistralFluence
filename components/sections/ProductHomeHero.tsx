export function ProductHomeHero(): JSX.Element {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_10%_12%,rgba(255,223,190,0.6),transparent_40%),radial-gradient(circle_at_82%_16%,rgba(193,228,255,0.62),transparent_42%),linear-gradient(180deg,#fdfaf3_0%,#f5f0e5_100%)] px-4 pb-20 pt-7 md:px-8 md:pb-28 md:pt-10">
      <div className="hero-grid-lines absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,70,0.12),transparent_35%),radial-gradient(circle_at_85%_25%,rgba(61,178,255,0.14),transparent_45%)]" />

      <div className="relative mx-auto w-full max-w-7xl">
        <div className="mb-9 flex items-center justify-between rounded-full border border-slate-300/70 bg-white/85 px-4 py-3 shadow-panel-crisp backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-brandCoral" />
            <span className="font-body text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700 md:text-xs">
              MistralFluence
            </span>
          </div>
          <a
            href="#waitlist"
            className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 md:px-5"
          >
            Request Invite
          </a>
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div className="flex w-full flex-col items-center">
            <p className="inline-flex rounded-full border border-slate-300/85 bg-white/80 px-4 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              INFRASTRUCTURE-FIRST WORKFLOW
            </p>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[0.99] tracking-[-0.01em] text-ink md:text-7xl">
               Your AI agent becomes an influencer.
             </h1>
             <p className="mt-5 max-w-2xl font-body text-lg font-normal leading-[1.45] text-mutedInk md:text-xl">
               Create a persona. Research trends. Generate scripts. Produce videos. Powered by Mistral AI.
             </p>
             <p className="mt-7 inline-flex items-center gap-2 font-body text-sm font-semibold text-ink md:text-base">
               <span className="h-2 w-2 rounded-full bg-brandCoral" />
               Fine-tuned Mistral-7B + ElevenLabs + LTX Video
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-6">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center rounded-full bg-brandCoral px-7 py-3 font-body text-sm font-semibold text-white transition hover:bg-orange-500"
              >
                Request Invite
              </a>
              <a
                href="#pipeline"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/90 px-7 py-3 font-body text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
              >
                See the Pipeline
              </a>
            </div>
            <p className="mt-3 font-body text-xs font-medium text-slate-500 md:text-[13px]">
              Mistral Worldwide Hackathon 2026. Built with Mistral AI.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
