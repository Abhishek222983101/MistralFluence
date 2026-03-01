import ConnectPlatforms from "./ConnectPlatforms";

export const dynamic = "force-dynamic";

export default function ConnectPage() {
  return (
    <div className="mx-auto max-w-[700px] space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">Connect Platforms</h1>
        <p className="text-text-muted text-sm">
          Link your social accounts so your AI bot can publish content autonomously.
          This is a one-time setup — your bot handles everything after.
        </p>
      </div>

      <ConnectPlatforms />
    </div>
  );
}
