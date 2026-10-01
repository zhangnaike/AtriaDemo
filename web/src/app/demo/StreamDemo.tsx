"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Terminal, Eye, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { DEMO_APPS } from "./apps";
import { CodeStream, type CodeStreamHandle } from "./CodeStream";
import { PreviewPane } from "./PreviewPane";
import { AppSelector } from "./AppSelector";
import { ControlBar } from "./ControlBar";
import {
  useStreamPlayback,
  type PlaybackState,
  type Speed,
} from "./useStreamPlayback";
import { LeftPane } from "./LeftPane";
import { RightPane } from "./RightPane";
import { ControlFooter } from "./ControlFooter";

type Follow = "auto" | "manual";

export function StreamDemo() {
  const [appId, setAppId] = useState(DEMO_APPS[0].id);
  const app = useMemo(
    () => DEMO_APPS.find((a) => a.id === appId) ?? DEMO_APPS[0],
    [appId],
  );

  // handle 用 ref 保存：onChunk 由引擎 cbRef 持有，必须能拿到最新值。
  // 若只用 state，引擎闭包会捕获旧 handle（=null），追加全部被吞。
  const handleRef = useRef<CodeStreamHandle | null>(null);
  const setHandleSafe = (h: CodeStreamHandle | null) => {
    handleRef.current = h;
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<Follow>("auto");
  const [follow, setFollowState] = useState<Follow>("auto");
  const [pb, setPb] = useState<PlaybackState | null>(null);

  // fullText 由引擎管理：onChunk 直接拿到切片，PreviewPane 用 getText()
  const onChunk = useCallback(
    (from: number, to: number, chunk: string) => {
      void to;
      void from;
      handleRef.current?.append(chunk);
      if (followRef.current === "auto" && scrollRef.current) {
        const el = scrollRef.current;
        el.scrollTop = el.scrollHeight;
      }
    },
    [],
  );

  const engine = useStreamPlayback(app.textUrl, {
    onChunk,
    onStatus: setPb,
  });

  // 切换应用：清空代码流
  useEffect(() => {
    handleRef.current?.clear();
    followRef.current = "auto";
    setFollowState("auto");
  }, [appId]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 6;
    const next: Follow = atBottom ? "auto" : "manual";
    if (next !== followRef.current) {
      followRef.current = next;
      setFollowState(next);
    }
  }, []);

  const setFollow = useCallback((v: Follow) => {
    followRef.current = v;
    setFollowState(v);
    if (v === "auto" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const onPickApp = useCallback(
    (id: string) => {
      if (id === appId) {
        engine.reload();
      } else {
        setAppId(id);
      }
    },
    [appId, engine],
  );

  const onSpeed = useCallback(
    (s: Speed) => {
      engine.setSpeed(s);
      if (pb?.status === "buffering" || pb?.status === "paused") engine.play();
    },
    [engine, pb?.status],
  );

  // 重播：先同步清空代码流，再交给引擎重新加载。
  // 引擎的 reload 是 async（fetch），若不先清空，旧 rAF 的最后一帧
  // 会继续追加，出现「重播后字数反而增多」的现象。
  const onReplay = useCallback(() => {
    handleRef.current?.clear();
    engine.reload();
  }, [engine]);

  // 自动开始播放
  useEffect(() => {
    if (pb?.status === "buffering") engine.play();
  }, [pb?.status, engine]);

  const status = pb?.status ?? "loading";
  const done = status === "done";
  const pct = pb ? Math.round(pb.progress * 100) : 0;
  const generating = status === "playing" || status === "paused";

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-line bg-ink-bg-soft/80 px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-fg-dim transition-colors hover:text-ink-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <span className="h-4 w-px bg-ink-line" />
          <span className="text-sm font-medium text-ink-fg">墨晓 · Ink Dawn</span>
          <span className="rounded-md border border-ink-line px-2 py-0.5 text-[10px] tracking-wider text-ink-fg-faint">
            DEMO
          </span>
        </div>
        <span className="text-xs text-ink-fg-faint">Atria Dawn · 一语成应用</span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <AppSelector apps={DEMO_APPS} currentId={appId} onPick={onPickApp} />

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          <LeftPane
            pb={pb}
            status={status}
            pct={pct}
            generating={generating}
            done={done}
            prompt={app.prompt}
            onReady={setHandleSafe}
            scrollRef={scrollRef}
            onScroll={onScroll}
            follow={follow}
            onSetFollow={setFollow}
          />
          <RightPane pb={pb} done={done} appId={app.id} getText={engine.getText} />
        </div>

        <ControlFooter
          pb={pb}
          onPlay={engine.play}
          onPause={engine.pause}
          onReplay={onReplay}
          onSpeed={onSpeed}
        />
      </div>
    </main>
  );
}
