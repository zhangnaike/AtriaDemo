"use client";

import { Eye } from "lucide-react";
import { PreviewPane } from "./PreviewPane";
import type { PlaybackState } from "./useStreamPlayback";

interface Props {
  pb: PlaybackState | null;
  done: boolean;
  appId: string;
  getText: () => string;
}

export function RightPane(props: Props) {
  const { pb, done, appId, getText } = props;
  const pct = pb ? Math.round(pb.progress * 100) : 0;

  return (
    <section className="panel-ink flex min-h-0 flex-col overflow-hidden rounded-xl">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-ink-line px-4">
        <Eye className="h-4 w-4 text-ink-cyan" />
        <span className="text-xs font-medium tracking-wide text-ink-fg-dim">
          预览 · Preview
        </span>
        {done ? (
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-ink-fg-faint">
            渲染完成 · {pct}%
          </span>
        ) : (
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-ink-fg-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-cyan" />
            正在生成… {pct}%
          </span>
        )}
      </div>
      <PreviewPane
        progress={pb?.progress ?? 0}
        done={done}
        appId={done ? appId : null}
        getText={getText}
      />
    </section>
  );
}
