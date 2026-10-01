"use client";

import { memo } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { SPEEDS, type Speed } from "./useStreamPlayback";
import type { PlaybackState } from "./useStreamPlayback";

interface Props {
  state: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onSpeed: (s: Speed) => void;
}

export function ControlBar({ state, onPlay, onPause, onReplay, onSpeed }: Props) {
  const playing = state.status === "playing";
  const canPlay = state.status === "buffering" || state.status === "paused";
  const canReplay = state.status !== "loading";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        disabled={!canPlay && !playing}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-line bg-ink-panel px-3 text-xs font-medium text-ink-fg transition-colors hover:border-ink-fg-faint disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={playing ? "暂停" : "播放"}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        <span>{playing ? "暂停" : "播放"}</span>
      </button>

      <button
        type="button"
        onClick={onReplay}
        disabled={!canReplay}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-line bg-ink-panel px-3 text-xs font-medium text-ink-fg-dim transition-colors hover:border-ink-fg-faint hover:text-ink-fg disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="重播"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>重播</span>
      </button>

      <div className="mx-1 h-5 w-px bg-ink-line" />

      <div className="flex items-center gap-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeed(s)}
            className={[
              "h-8 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
              state.speed === s
                ? "border-ink-amber bg-ink-amber/10 text-ink-amber"
                : "border-ink-line bg-ink-panel text-ink-fg-faint hover:text-ink-fg",
            ].join(" ")}
            aria-pressed={state.speed === s}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

export const ControlBarMemo = memo(ControlBar);
export default ControlBar;
