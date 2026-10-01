import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6">
      {/* 背景光晕：黎明金橙 + 青蓝点缀 */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            "radial-gradient(ellipse at 38% 50%, rgba(251,191,36,0.16), rgba(249,115,22,0.10) 45%, transparent 68%), radial-gradient(ellipse at 78% 22%, rgba(34,211,238,0.08), transparent 55%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-ink-line bg-ink-panel/70 px-4 py-1.5 text-xs tracking-wide text-ink-fg-dim backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-ink-amber" />
          Atria Dawn · 一语成应用
        </span>

        <h1 className="text-dawn text-6xl font-bold tracking-tight sm:text-7xl">
          墨晓 · Ink Dawn
        </h1>

        <p className="mt-6 text-lg text-ink-fg-dim sm:text-xl">
          Atria Dawn 一语成应用 · Demo
        </p>

        <Link
          href="/demo"
          className="bg-dawn group mt-12 inline-flex items-center gap-2.5 rounded-xl px-8 py-3.5 text-base font-semibold text-black shadow-lg shadow-orange-500/20 transition-transform duration-200 hover:scale-[1.03] active:scale-100"
        >
          进入 Demo
          <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>

        <p className="mt-5 text-xs text-ink-fg-faint">
          一句话，生成完整可运行应用
        </p>
        <p className="mt-1.5 text-xs text-ink-fg-faint/80">
          打开 Demo 后选择一个应用，观看代码流式生成、预览实时成形的完整过程
        </p>
      </div>
    </main>
  );
}
