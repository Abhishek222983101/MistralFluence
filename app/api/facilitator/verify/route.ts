import { NextRequest, NextResponse } from "next/server";

const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL?.trim() || "https://x402-facilitator.molandak.org";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentPayload, paymentRequirements } = body;

    if (!paymentPayload || !paymentRequirements) {
      return NextResponse.json(
        { error: "Missing paymentPayload or paymentRequirements" },
        { status: 400 },
      );
    }

    const res = await fetch(`${FACILITATOR_URL.replace(/\/+$/, "")}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPayload, paymentRequirements }),
    });
    const result = await res.json().catch(() => ({}));

    return NextResponse.json(result, { status: res.status });
  } catch (error) {
    console.error("[facilitator/verify] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
