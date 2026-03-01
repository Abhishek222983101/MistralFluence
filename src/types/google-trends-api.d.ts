declare module "google-trends-api" {
  interface DailyTrendsOptions {
    geo?: string;
    trendDate?: Date;
    hl?: string;
  }

  /** Returns a JSON string of daily trending searches. */
  export function dailyTrends(options?: DailyTrendsOptions): Promise<string>;
}
