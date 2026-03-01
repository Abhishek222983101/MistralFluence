export function runLog(event: string, data: Record<string, unknown>) {
  const payload = {
    t: new Date().toISOString(),
    event,
    ...data,
  };

  console.log("[monadfluence-run]", JSON.stringify(payload));
}
