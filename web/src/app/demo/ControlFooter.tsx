"use client";

import { memo } from "react";
import { ControlBar } from "./ControlBar";
import type { PlaybackState, Speed } from "./useStreamPlayback";

interface Props {
  pb: PlaybackState | null;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onSpeed: (s: Speed) => void;
}

export function ControlFooter(props: Props) {
  const { pb, onPlay, onPause, onReplay, onSpeed } = props;
  return (
    <div className="flex h-11 shrink-0 items-center justify-between rounded-xl border border-ink-line bg-ink-panel/60 px-3">
      <ControlBar
        state={pb ?? defaultState}
        onPlay={onPlay}
        onPause={onPause}
        onReplay={onReplay}
        onSpeed={onSpeed}
      />
      <span className="text-[11px] tabular-nums text-ink-fg-faint">
        {(pb?.speed ?? 1)}x · {pb ? Math.round(pb.progress * 100) : 0}%
      </span>
    </div>
  );
}

const defaultState: PlaybackState = {
  status: "loading",
  chars: 0,
  total: 0,
  speed: 1,
  progress: 0,
  error: null,
};

export const ControlFooterMemo = memo(ControlFooter);
export default ControlFooter;
