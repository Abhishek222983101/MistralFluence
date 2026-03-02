export interface WaitlistApiSuccessResponse {
  ok: true;
  referralLink: string;
  referralCode: string;
  alreadyJoined: boolean;
}

export interface WaitlistApiErrorResponse {
  ok: false;
  message: string;
}

export type WaitlistApiResponse = WaitlistApiSuccessResponse | WaitlistApiErrorResponse;

export interface UpsertWaitlistInput {
  email: string;
  referredByCode?: string | null;
}

export interface UpsertWaitlistResult {
  email: string;
  referralCode: string;
  alreadyJoined: boolean;
}

export interface WaitlistSignupRecord {
  id: string;
  email: string;
  referralCode: string;
  referredById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralLeaderboardRow {
  referrerId: string;
  email: string;
  referralCode: string;
  referralCount: number;
  joinedAt: string;
}
