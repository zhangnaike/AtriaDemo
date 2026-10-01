"use client";

import { Terminal, Check } from "lucide-react";
import type { PlaybackState, PlaybackStatus } from "./useStreamPlayback";
import { CodeStream, type CodeStreamHandle } from "./CodeStream";

interface Props {
  pb: PlaybackState | null;
  status: PlaybackStatus;
  pct: number;
  generating: boolean;
  done: boolean;
  prompt: string;
  onReady: (h: CodeStreamHandle | null) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  follow: "auto" | "manual";
  onSetFollow: (v: "auto" | "manual") => void;
}

export function LeftPane(props: Props) {
  const { pb, status, pct, generating, done, prompt, onReady, scrollRef, onScroll, follow, onSetFollow } = props;
  const chars = pb?.chars ?? 0;
  const total = pb?.total ?? 0;

  return (
    <section className="panel-ink scroll-ink flex min-h-0 flex-col overflow-hidden rounded-xl">
      {/* 顶部状态条 */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-ink-line px-4">
        <Terminal className="h-4 w-4 text-ink-amber" />
        <span className="text-xs font-medium tracking-wide text-ink-fg-dim">
          生成流 · Stream
        </span>
        {generating && (
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-ink-fg-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-amber" />
            生成中…
          </span>
        )}
        {done && (
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-ink-fg-faint">
            <Check className="h-3 w-3 text-ink-amber" />
            生成完成
          </span>
        )}
        <span className="ml-auto text-[10px] tabular-nums text-ink-fg-faint">
          {chars} / {total} 字符
        </span>
      </div>

      {/* prompt 回显 */}
      <div className="border-b border-ink-line bg-black/40 px-4 py-2">
        <p className="font-mono text-[11px] leading-relaxed text-ink-fg-faint">
          <span className="text-ink-amber">$</span> {prompt}
        </p>
      </div>

      {/* 进度条 */}
      <div className="h-0.5 w-full bg-ink-line">
        <div
          className="bg-dawn h-full transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 代码流。光标由 CSS .ln-active::after 接在进行中行末尾 */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scroll-ink relative min-h-0 flex-1 overflow-auto bg-black p-4"
      >
        <CodeStream onReady={onReady} className="min-h-full font-mono text-[12.5px] leading-[1.65]" />
      </div>

      {/* 跟随开关 */}
      <button
        type="button"
        onClick={() => onSetFollow(follow === "auto" ? "manual" : "auto")}
        className="flex h-8 shrink-0 items-center gap-2 border-t border-ink-line px-4 text-[11px] text-ink-fg-faint transition-colors hover:text-ink-fg"
      >
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            follow === "auto" ? "bg-ink-amber" : "bg-ink-fg-faint",
          ].join(" ")}
        />
        {follow === "auto" ? "滚动到底部自动跟随" : "已暂停跟随（点击恢复）"}
      </button>
    </section>
  );
}
