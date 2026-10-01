"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Check } from "lucide-react";
import { sanitizePartialHtml } from "./sanitize";

/* 预览窗：await（等待生成）→ generating（每 ~1.6s 写 srcdoc）→ ready（切正式 html） */

const FLUSH_INTERVAL_MS = 1600;

type Phase = "await" | "generating" | "ready";

export interface PreviewPaneProps {
  progress: number;
  done: boolean;
  appId: string | null;
  getText: () => string;
}

export function PreviewPane(props: PreviewPaneProps) {
  const { progress, done, appId, getText } = props;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lastFlushAtRef = useRef(0);
  const phaseRef = useRef<Phase>("await");
  const [phase, setPhase] = useState<Phase>("await");
  const [showBar, setShowBar] = useState(false);

  const setPhaseSafe = (p: Phase) => {
    if (phaseRef.current === p) return;
    phaseRef.current = p;
    setPhase(p);
  };

  const writeSrcDoc = (text: string) => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.srcdoc = sanitizePartialHtml(text).doc;
  };

  // 进度推进时节流写 srcdoc（throttle 而非 debounce：
  // 早期版本把 setTimeout 放进每次 progress 变化的 effect，
  // 定时器被不断重置导致 srcdoc 永远为空 —— 已修复的真实 bug）
  useEffect(() => {
    if (done || progress <= 0) return;
    const now = Date.now();
    if (now - lastFlushAtRef.current >= FLUSH_INTERVAL_MS) {
      lastFlushAtRef.current = now;
      setPhaseSafe("generating");
      writeSrcDoc(getText());
    }
  }, [progress, done, getText]);

  // 完成态：srcdoc → src
  useEffect(() => {
    if (!done || !appId) return;
    writeSrcDoc(getText());
    setPhaseSafe("ready");
    setShowBar(true);
    const frame = frameRef.current;
    if (!frame) return;
    // 先移除 srcdoc 再设 src：两者并存时 srcdoc 优先级更高，
    // src 不会生效（真实浏览器与 jsdom 行为一致）。
    frame.removeAttribute("srcdoc");
    frame.src = "/apps/" + appId + "/index.html";
  }, [done, appId, getText]);

  // 切换应用：重置。
  // 注意完成态 appId 会从 null 变为正式 id，那是「加载正式应用」而非「切换应用」，
  // 不能重置（历史上它会覆盖完成 effect 写入的 src，导致 iframe 卡在 about:blank）。
  // 只在应用真正切换（旧值非 null 且新值非 null）时重置。
  const prevAppRef = useRef<string | null>(appId);
  useEffect(() => {
    const prev = prevAppRef.current;
    prevAppRef.current = appId;
    if (prev === appId) return;
    if (prev === null) return; // null -> appId 是首次进入/完成态，不重置
    setPhaseSafe("await");
    setShowBar(false);
    lastFlushAtRef.current = 0;
    const frame = frameRef.current;
    if (!frame) return;
    frame.src = "about:blank";
    frame.removeAttribute("srcdoc");
  }, [appId]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-ink-bg-soft">
      {phase === "generating" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-line bg-ink-panel/90 px-3 py-1 text-xs text-ink-fg-dim shadow-lg backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-amber" />
            正在生成… {Math.round(progress * 100)}%
          </span>
        </div>
      )}
      {phase === "ready" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-line bg-ink-panel/90 px-3 py-1 text-xs text-ink-fg-dim shadow-lg backdrop-blur">
            <Check className="h-3 w-3 text-ink-amber" />
            渲染完成
          </span>
        </div>
      )}
      {phase === "await" && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-ink-bg-soft">
          <div className="flex flex-col items-center gap-3 text-ink-fg-faint">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-dashed border-ink-line [animation-duration:3s]" />
            <span className="text-xs tracking-wide">等待生成</span>
          </div>
        </div>
      )}
      <iframe
        ref={frameRef}
        title="Atria Preview"
        className="absolute inset-0 z-0 h-full w-full border-0 bg-white"
      />
      {showBar && appId && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-end p-3">
          <a
            href={"/apps/" + appId + "/index.html"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-line bg-ink-panel/90 px-3 py-1.5 text-xs text-ink-fg-dim backdrop-blur transition-colors hover:text-ink-fg"
          >
            <ExternalLink className="h-3 w-3" />
            在新窗口打开
          </a>
        </div>
      )}
    </div>
  );
}
