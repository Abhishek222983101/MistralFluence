import ContentStudio from "./ContentStudio";

export const dynamic = "force-dynamic";

export default function StudioPage() {
  return (
    <div className="mx-auto max-w-[780px] space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">Content Studio</h1>
        <p className="text-text-muted text-sm">
          Generate AI videos and publish Instagram Reels — powered by LTX-2-fast.
        </p>
      </div>

      <ContentStudio />
    </div>
  );
}
