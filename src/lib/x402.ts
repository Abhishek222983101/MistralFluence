/**
 * x402 Protocol utilities for EVM pay-per-call endpoints.
 * Monad-first network selection via configured facilitator.
 */

import { NextResponse } from "next/server";
import { getX402Config } from "@/lib/monadfluence/x402-config";

export interface X402PaymentOptionV2 {
  scheme: "exact";
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
}

export interface X402ResponseV2 {
  x402Version: 2;
  error: string;
  resource: {
    url: string;
    description?: string;
    mimeType?: string;
  };
  accepts: X402PaymentOptionV2[];
  extensions?: Record<string, unknown>;
}

export interface X402PaymentHeader {
  txSignature: string;
  payer?: string;
  network?: string;
  asset?: string;
  resource?: string;
  amount?: string;
  rawHeader: string;
  isPresigned?: boolean;
}

export interface X402VerificationResult {
  valid: boolean;
  reason?: string;
  payer?: string;
  network?: string;
  asset?: string;
}

export function x402PaymentRequired(opts: {
  priceUsd: number;
  recipient: string;
  description: string;
  resourceUrl: string;
}): NextResponse {
  // MONAD USDC has 6 decimals
  const amountWei = BigInt(Math.round(opts.priceUsd * 1e6)).toString();
  const config = getX402Config();
  const networks = [config.primary];

  const accepts: X402PaymentOptionV2[] = networks.map((net) => ({
    scheme: "exact",
    network: net.caip2,
    amount: amountWei,
    asset: net.asset,
    payTo: opts.recipient,
    maxTimeoutSeconds: 300,
    extra: {
      name: net.assetName,
      version: net.assetVersion,
      assetTransferMethod: net.assetTransferMethod,
    },
  }));

  const body: X402ResponseV2 = {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: opts.resourceUrl,
      description: opts.description,
      mimeType: "application/json",
    },
    accepts,
    extensions: {},
  };

  const jsonStr = JSON.stringify(body);
  const base64Payload = Buffer.from(jsonStr).toString("base64");

  return new NextResponse(jsonStr, {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "Payment-Required": base64Payload,
    },
  });
}

export async function verifyPaymentHeader(opts: {
  payment: X402PaymentHeader;
  expectedAsset?: string;
  expectedNetwork?: string;
  expectedRecipient?: string;
  resource?: string;
  requiredAmount?: string;
  maxAmountRequired?: string;
  description?: string;
}): Promise<X402VerificationResult> {
  const config = getX402Config();
  const networkConfigs = [config.primary];
  const acceptedNetworks = new Set<string>();
  for (const net of networkConfigs) {
    if (net.network) acceptedNetworks.add(net.network);
    if (net.caip2) acceptedNetworks.add(net.caip2);
  }

  const paymentPayload = extractPaymentPayload(opts.payment);
  const paymentNetwork =
    opts.payment.network ??
    (typeof paymentPayload?.network === "string" ? paymentPayload.network : undefined) ??
    (typeof paymentPayload?.accepted?.network === "string" ? paymentPayload.accepted.network : undefined) ??
    opts.expectedNetwork;

  if (paymentNetwork && !acceptedNetworks.has(paymentNetwork)) {
    return {
      valid: false,
      reason: `Unsupported payment network: ${paymentNetwork}`,
    };
  }

  const selectedNetworkConfig =
    networkConfigs.find((net) => net.network === paymentNetwork || net.caip2 === paymentNetwork) ?? config.primary;

  const expectedNetwork = opts.expectedNetwork ?? paymentNetwork ?? selectedNetworkConfig.caip2 ?? selectedNetworkConfig.network;
  const paymentAsset = opts.payment.asset ?? paymentPayload?.accepted?.asset;
  const expectedAsset = opts.expectedAsset ?? paymentAsset ?? selectedNetworkConfig.asset;
  const expectedResource =
    opts.resource ??
    opts.payment.resource ??
    (typeof paymentPayload?.resource?.url === "string" ? paymentPayload.resource.url : undefined);
  const expectedAmount =
    opts.requiredAmount ??
    opts.maxAmountRequired ??
    opts.payment.amount ??
    (typeof paymentPayload?.accepted?.amount === "string" ? paymentPayload.accepted.amount : undefined);

  if (paymentAsset && expectedAsset && paymentAsset !== expectedAsset) {
    return {
      valid: false,
      reason: `Invalid asset: expected ${expectedAsset}, got ${paymentAsset}`,
    };
  }

  if (expectedResource && opts.payment.resource && expectedResource !== opts.payment.resource) {
    return {
      valid: false,
      reason: "Payment resource does not match",
    };
  }

  if (!opts.payment.txSignature || opts.payment.txSignature.length < 40) {
    return {
      valid: false,
      reason: "Missing or invalid tx signature",
    };
  }

  if (!config.facilitatorUrl) {
    // Local fallback mode (dev only): signature + basic consistency checks.
    return {
      valid: true,
      payer: opts.payment.payer,
      network: expectedNetwork,
      asset: expectedAsset ?? paymentAsset,
    };
  }

  if (!paymentPayload) {
    return {
      valid: false,
      reason: "Invalid x402 payment payload: expected JSON/base64 x402 envelope",
    };
  }

  if (!expectedNetwork) {
    return {
      valid: false,
      reason: "Missing expected payment network",
    };
  }

  if (!expectedAsset) {
    return {
      valid: false,
      reason: "Missing expected payment asset",
    };
  }

  if (!expectedResource) {
    return {
      valid: false,
      reason: "Missing expected payment resource",
    };
  }

  if (!expectedAmount) {
    return {
      valid: false,
      reason: "Missing expected payment amount",
    };
  }

  if (!opts.expectedRecipient) {
    return {
      valid: false,
      reason: "Missing expected payment recipient",
    };
  }

  const x402Version = paymentPayload?.x402Version === 1 ? 1 : 2;
  const verifyUrl = getFacilitatorVerifyUrl(config.facilitatorUrl);
  const requestBody = {
    x402Version,
    paymentPayload,
    paymentRequirements:
      x402Version === 1
        ? {
            scheme: "exact",
            network: expectedNetwork,
            maxAmountRequired: String(expectedAmount),
            resource: expectedResource,
            description: opts.description ?? "Paid API access",
            mimeType: "application/json",
            outputSchema: null,
            payTo: opts.expectedRecipient,
            maxTimeoutSeconds: 300,
            asset: expectedAsset,
            extra: {},
          }
        : {
            scheme: "exact",
            network: expectedNetwork,
            // Compatibility: some facilitator deployments still expect v1-ish fields
            // (maxAmountRequired/resource/description/mimeType/outputSchema) even for x402 v2 payloads.
            amount: String(expectedAmount),
            maxAmountRequired: String(expectedAmount),
            resource: expectedResource,
            description: opts.description ?? "Paid API access",
            mimeType: "application/json",
            outputSchema: null,
            payTo: opts.expectedRecipient,
            maxTimeoutSeconds: 300,
            asset: expectedAsset,
            extra: {
              name: selectedNetworkConfig.assetName,
              version: selectedNetworkConfig.assetVersion,
              assetTransferMethod: selectedNetworkConfig.assetTransferMethod,
            },
          },
  };

  try {
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data: any = await res.json().catch(() => ({}));
    const isValid =
      typeof data?.isValid === "boolean"
        ? data.isValid
        : typeof data?.valid === "boolean"
          ? data.valid
          : typeof data?.success === "boolean"
            ? data.success
          : undefined;

    if (!res.ok) {
      console.error("[x402-verify] Facilitator error:", res.status, JSON.stringify(data));
      return {
        valid: false,
        reason: data?.error ?? data?.reason ?? `Facilitator verify failed (${res.status})`,
      };
    }

    if (isValid !== true) {
      return {
        valid: false,
        reason: data?.invalidReason ?? data?.reason ?? "Facilitator rejected payment proof",
      };
    }

    // Settle payment on-chain after verify. Service access is granted only
    // when settlement succeeds.
    const settleUrl = getFacilitatorSettleUrl(config.facilitatorUrl);
    try {
      const settleRes = await fetch(settleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const settleData: any = await settleRes.json().catch(() => ({}));
      const settled =
        typeof settleData?.success === "boolean"
          ? settleData.success
          : typeof settleData?.isValid === "boolean"
            ? settleData.isValid
            : settleRes.ok;

      if (!settleRes.ok) {
        console.error("[x402-settle] Facilitator settle error:", settleRes.status, JSON.stringify(settleData));
        return {
          valid: false,
          reason: settleData?.error ?? settleData?.reason ?? `Facilitator settle failed (${settleRes.status})`,
        };
      }

      if (!settled) {
        return {
          valid: false,
          reason: settleData?.error ?? settleData?.reason ?? "Facilitator did not confirm settlement",
        };
      }

      console.log("[x402-settle] Settled:", settleData?.txHash ?? settleData?.transactionHash ?? settleData?.transaction ?? "ok");
    } catch (settleErr) {
      console.error("[x402-settle] Settle request failed:", (settleErr as Error).message);
      return {
        valid: false,
        reason: `Facilitator settlement request failed: ${(settleErr as Error).message}`,
      };
    }

    return {
      valid: true,
      payer: data?.payer ?? opts.payment.payer,
      network: expectedNetwork,
      asset: expectedAsset,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Facilitator verification request failed: ${(error as Error).message}`,
    };
  }
}

export function paymentAuditLog(opts: {
  action: "generate-image" | "generate-video" | "publish-reel" | "caption-video";
  payment: X402PaymentHeader;
  verification: X402VerificationResult;
  userKey: string;
  resource: string;
}) {
  const payload = {
    t: new Date().toISOString(),
    action: opts.action,
    userKey: opts.userKey,
    txSignature: opts.payment.txSignature,
    payer: opts.verification.payer ?? opts.payment.payer,
    network: opts.verification.network ?? opts.payment.network,
    asset: opts.verification.asset ?? opts.payment.asset,
    resource: opts.resource,
    valid: opts.verification.valid,
  };

  // Structured logs for demo playback and debugging.
  console.log("[x402-audit]", JSON.stringify(payload));
}

/**
 * Convert USDC amount (6 decimals) to USD.
 * Kept named microUsdcToUsd for API compat — now expects 6-decimal wei.
 */
export function microUsdcToUsd(weiAmount: number | bigint): number {
  return Number(weiAmount) / 1e6;
}

/** Convert USD to USDC wei (6 decimals). */
export function usdToMusdc(usd: number): bigint {
  return BigInt(Math.round(usd * 1e6));
}

export function parsePaymentHeader(req: Request): X402PaymentHeader | null {
  const raw =
    req.headers.get("payment-signature") ??
    req.headers.get("PAYMENT-SIGNATURE") ??
    req.headers.get("Payment-Signature") ??
    req.headers.get("x-payment") ??
    req.headers.get("X-PAYMENT");

  if (!raw || raw.trim().length === 0) return null;

  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    return parseJsonPayment(parsed, trimmed);
  } catch {
    // not JSON
  }

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return parseJsonPayment(parsed, trimmed);
  } catch {
    // not base64 JSON
  }

  return {
    txSignature: trimmed,
    rawHeader: trimmed,
    isPresigned: true,
  };
}

function parseJsonPayment(parsed: any, rawHeader: string): X402PaymentHeader {
  if (parsed?.x402Version === 2 && parsed?.payload) {
    const payload = parsed.payload;
    const authorization = payload.authorization ?? payload.permit2Authorization;
    const payer = authorization?.from;
    const txSignature = payload.signature ?? parsed.transaction ?? parsed.txSignature;

    if (txSignature) {
      return {
        txSignature: String(txSignature),
        payer,
        network: parsed.accepted?.network,
        asset: parsed.accepted?.asset,
        amount: parsed.accepted?.amount,
        resource: parsed.resource?.url,
        rawHeader,
        isPresigned: true,
      };
    }
  }

  if (parsed.payload?.signature) {
    return {
      txSignature: parsed.payload.signature,
      payer: parsed.payload?.authorization?.from ?? parsed.payload?.permit2Authorization?.from,
      network: parsed.network ?? parsed.accepted?.network,
      asset: parsed.asset ?? parsed.accepted?.asset,
      amount: parsed.payload?.authorization?.value ?? parsed.amount ?? parsed.accepted?.amount,
      resource: parsed.resource?.url ?? parsed.resource,
      rawHeader,
      isPresigned: true,
    };
  }

  const txSig = parsed.txSignature ?? parsed.tx ?? parsed.transaction ?? parsed.payload?.transaction;
  if (txSig) {
    return {
      txSignature: String(txSig),
      payer: parsed.payer ?? parsed.from ?? parsed.payload?.authorization?.from,
      network: parsed.network ?? parsed.chain ?? parsed.accepted?.network,
      asset: parsed.asset ?? parsed.accepted?.asset,
      resource: parsed.resource?.url ?? parsed.resource,
      amount: parsed.amount ?? parsed.accepted?.amount,
      rawHeader,
      isPresigned: Boolean(parsed.payload),
    };
  }

  return {
    txSignature: rawHeader,
    rawHeader,
    isPresigned: true,
  };
}

function extractPaymentPayload(payment: X402PaymentHeader): any | null {
  const parsed = decodeHeaderObject(payment.rawHeader);

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if (parsed.paymentPayload && typeof parsed.paymentPayload === "object") {
    return parsed.paymentPayload;
  }

  if (parsed.x402Version === 2 && parsed.accepted && parsed.payload) {
    return parsed;
  }

  if (parsed.payload && (parsed.network || parsed.scheme || parsed.x402Version)) {
    return {
      x402Version: parsed.x402Version ?? 1,
      scheme: parsed.scheme ?? "exact",
      network: parsed.network,
      payload: parsed.payload,
    };
  }

  return null;
}

function decodeHeaderObject(rawHeader: string): any | null {
  if (!rawHeader) return null;

  try {
    return JSON.parse(rawHeader);
  } catch {
    // Try base64-encoded JSON.
  }

  try {
    const decoded = Buffer.from(rawHeader, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getFacilitatorVerifyUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/verify") ? trimmed : `${trimmed}/verify`;
}

function getFacilitatorSettleUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "").replace(/\/verify$/, "");
  return `${trimmed}/settle`;
}
