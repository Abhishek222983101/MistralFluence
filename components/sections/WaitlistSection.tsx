'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

import {
  REFERRAL_STORAGE_KEY,
  getReferralFromSearch,
  isValidEmail,
  normalizeEmail,
  sanitizeReferralCode
} from '@/lib/waitlist/referral';
import type { WaitlistApiResponse } from '@/lib/waitlist/types';

const REWARD_MESSAGE =
  'Top 100 referrers get 2 months free credits. Invite link unlocked after signup.';

export function WaitlistSection(): JSX.Element {
  const referralTimeoutRef = useRef<number | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const referredByRef = useRef<string | null>(null);

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [isRewardVisible, setIsRewardVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const referralFromUrl = getReferralFromSearch(window.location.search);
    if (referralFromUrl) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, referralFromUrl);
    }

    referredByRef.current = sanitizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY));

    return () => {
      if (referralTimeoutRef.current !== null) {
        window.clearTimeout(referralTimeoutRef.current);
      }
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Enter a valid email address to join the waitlist.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setReferralLink(null);
    setReferralCode(null);
    setAlreadyJoined(false);
    setIsRewardVisible(false);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: normalizedEmail,
          referredBy: referredByRef.current
        })
      });

      const payload = (await response.json()) as WaitlistApiResponse;
      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.ok ? 'Unable to join right now. Please try again.' : payload.message);
        return;
      }

      setEmail(normalizedEmail);
      setReferralLink(payload.referralLink);
      setReferralCode(payload.referralCode);
      setAlreadyJoined(payload.alreadyJoined);
      setIsRewardVisible(true);
      setIsCopied(false);

      if (referralTimeoutRef.current !== null) {
        window.clearTimeout(referralTimeoutRef.current);
      }
      referralTimeoutRef.current = window.setTimeout(() => {
        setIsRewardVisible(false);
      }, 6000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to join right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareOnX = (): void => {
    if (!referralLink) {
      return;
    }

    const shareText = `I grabbed early access to MistralFluence — an AI influencer engine built on Mistral AI. Want in? ${referralLink}`;

    const shareUrl = new URL('https://twitter.com/intent/tweet');
    shareUrl.searchParams.set('text', shareText);
    window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleCopyReferral = async (): Promise<void> => {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 2200);
    } catch {
      setErrorMessage('Could not copy link automatically. Please copy it manually.');
    }
  };

  return (
    <section
      id="waitlist"
      className="relative bg-[linear-gradient(180deg,#f4efe3_0%,#f1ebdf_100%)] px-4 py-20 md:px-8"
      aria-labelledby="waitlist-title"
    >
      <div className="mx-auto grid max-w-6xl gap-10 rounded-[2rem] border border-slate-300/70 bg-panel px-7 py-8 shadow-panel-soft md:grid-cols-[1.08fr_0.92fr] md:px-12 md:py-12">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-slate-300 bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Launch Access
          </p>
          <h2 id="waitlist-title" className="font-display text-3xl font-semibold text-ink md:text-5xl">
            Get early access to MistralFluence.
          </h2>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-mutedInk">
            Top 100 referrers get 2 months free credits. Invite link unlocked after signup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-panel-crisp md:p-6">
          <label htmlFor="waitlist-email" className="text-sm font-medium text-slate-600">
            Work Email
          </label>
          <input
            id="waitlist-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@brand.com"
            autoComplete="email"
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-ink placeholder:text-slate-400 outline-none transition focus:border-brandSky"
          />

          <p className="text-xs text-slate-500">We will generate your shareable referral link immediately after you join.</p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Requesting Invite...' : 'Request Invite'}
          </button>
          <p className="text-xs font-medium text-slate-500">Limited beta. We onboard in waves.</p>

          {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}

          {referralLink ? (
            <div className="mt-3 rounded-2xl border border-brandSky/30 bg-brandSky/5 p-4">
              <p className="text-sm font-medium text-slate-700">{alreadyJoined ? 'Welcome back.' : "You're in."}</p>
              <p className="mt-1 text-sm text-slate-600">
                {alreadyJoined
                  ? 'You are already on the waitlist. Here is your referral link again.'
                  : 'Share your link to move up the waitlist.'}
              </p>
              {referralCode ? (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Referral Code</p>
                  <p className="mt-1 w-fit rounded-lg bg-white px-3 py-2 text-sm font-semibold tracking-[0.08em] text-slate-700">
                    {referralCode}
                  </p>
                </>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                {alreadyJoined ? 'Existing Referral Link' : 'Your Referral Link'}
              </p>
              <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 text-sm text-slate-700">{referralLink}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  {isCopied ? 'Copied' : 'Copy Referral Link'}
                </button>
                <button
                  type="button"
                  onClick={handleShareOnX}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Share on X
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </div>

      <div
        className={`pointer-events-none fixed bottom-5 right-5 z-50 max-w-sm transition-all duration-300 ${
          isRewardVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
        aria-live="polite"
      >
        <div className="pointer-events-auto rounded-2xl border border-amber-200/80 bg-white/95 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
              ★
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Referral Bonus</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{REWARD_MESSAGE}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsRewardVisible(false)}
              className="ml-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close reward popup"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
