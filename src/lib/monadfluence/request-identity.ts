import type { X402PaymentHeader } from "@/lib/x402";

export function resolveUserKey(req: Request, payment?: X402PaymentHeader | null): string {
  const explicit = req.headers.get("x-user-id") ?? req.headers.get("x-openclaw-user");
  if (explicit && explicit.trim()) return sanitize(explicit);

  const payer = payment?.payer;
  if (payer && payer.trim()) return `payer:${sanitize(payer)}`;

  const forwarded = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  if (forwarded && forwarded.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return `ip:${sanitize(first)}`;
  }

  return "anonymous";
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_\-.]/g, "_").slice(0, 120);
}
