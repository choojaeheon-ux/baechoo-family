export default function ComingSoon({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 text-6xl">{emoji}</div>
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone">{desc}</p>
      <span className="mt-6 rounded-full bg-leaf-light px-4 py-1.5 text-xs font-semibold text-leaf-dark">
        준비중 · 추후 개발 예정
      </span>
    </div>
  );
}
