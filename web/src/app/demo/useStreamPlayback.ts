"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TARGET_DURATION_MS } from "./apps";

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "buffering"
  | "playing"
  | "paused"
  | "done";

export type Speed = 1 | 2 | 4 | 8;

export const SPEEDS: readonly Speed[] = [1, 2, 4, 8];

export interface PlaybackState {
  status: PlaybackStatus;
  /** 已生成字符数 */
  chars: number;
  /** 总字符数 */
  total: number;
  /** 0-1 */
  progress: number;
  /** 当前速度倍数 */
  speed: Speed;
  /** 素材加载失败时的错误信息 */
  error: string | null;
}

export interface EngineCallbacks {
  /** 追加新文本（字符区间 + 该区间文本），同步触发 DOM 增量更新 */
  onChunk: (from: number, to: number, chunk: string) => void;
  /** 状态变更 */
  onStatus: (s: PlaybackState) => void;
}

/**
 * 回放引擎：把一份文本按「目标时长」匀速逐字吐出。
 *
 * 自适应速率：
 *   速率 = 总字符数 ÷ 目标时长（约 82s）
 *   三个应用长度不同（25KB / 31KB / 26KB），各自单独计算，
 *   所以 1x 下总时长相近；速度系数只乘在速率上，切换即时生效。
 *
 * 用 rAF 而非 setInterval：
 *   1. 标签页切到后台时 rAF 自动暂停，不会偷跑；
 *   2. 掉帧后用 elapsed 补偿，逐字速度仍恒定；
 *   3. 每帧批量结算多个字符，DOM 一帧只更新一次。
 *
 * PAUSED_QUERY: 进入 playing 前必须先有素材，故用 buffering 中间态。
 */
export function useStreamPlayback(
  appTextUrl: string | null,
  callbacks: EngineCallbacks,
) {
  const [state, setState] = useState<PlaybackState>({
    status: "idle",
    chars: 0,
    total: 0,
    progress: 0,
    speed: 1,
    error: null,
  });

  const textRef = useRef<string>("");
  const totalRef = useRef(0);
  const speedRef = useRef<Speed>(1);
  const charpsRef = useRef(0); // 每毫秒字符数（1x）
  const emittedRef = useRef(0); // 已结算字符数（整数）
  const fPosRef = useRef(0); // 浮点「书写位置」，小数部分累积避免漂移
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const statusRef = useRef<PlaybackStatus>("idle");
  const epochRef = useRef(0); // reload 竞态防护
  const charsRef = useRef(0); // 最新已结算字符（供暂停/完成时补齐 UI）
  const lastUiProgressRef = useRef(0); // UI 进度节流
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const emit = useCallback((patch: Partial<PlaybackState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      // 同步更新 statusRef：reload() 后立即调用 play() 时，
      // rAF tick 会先读到 statusRef，必须立刻看到新状态。
      statusRef.current = next.status;
      return next;
    });
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  const finish = useCallback(() => {
    stopRaf();
    if (emittedRef.current < totalRef.current) {
      const from = emittedRef.current;
      emittedRef.current = totalRef.current;
      cbRef.current.onChunk(from, totalRef.current, textRef.current.slice(from));
    }
    emit({
      status: "done",
      chars: totalRef.current,
      total: totalRef.current,
      progress: 1,
    });
  }, [emit, stopRaf]);

  const tick = useCallback(
    (ts: number) => {
      if (statusRef.current !== "playing") {
        stopRaf();
        return;
      }
      const last = lastTsRef.current ?? ts;
      // 限制单帧步长，防止切回标签页后一次跳一大截（观感不好）
      const dt = Math.min(ts - last, 120);
      lastTsRef.current = ts;

      const total = totalRef.current;
      // 精度模型：fPos 是浮点「书写位置」，整数 emitted = floor(fPos)。
      // 小数部分不丢弃而是累积，避免每帧 Math.floor 造成的累积漂移。
      fPosRef.current = Math.min(
        fPosRef.current + charpsRef.current * dt * speedRef.current,
        total,
      );

      const newPos = Math.floor(fPosRef.current);
      if (newPos > emittedRef.current) {
        const from = emittedRef.current;
        emittedRef.current = newPos;
        cbRef.current.onChunk(from, newPos, textRef.current.slice(from, newPos));
        // 同步推进 React state：进度条 / 百分比 / 预览 srcdoc 都依赖它。
        // 早期版本只调 onChunk 不调 emit，导致 UI 永远停在 buffering。
        // 节流：进度变化不足 0.4% 时不触发重渲染（约 30fps 的视觉刷新）。
        const np = total ? newPos / total : 0;
        if (np - lastUiProgressRef.current >= 0.004) {
          lastUiProgressRef.current = np;
          emit({ chars: newPos, progress: np });
        } else {
          charsRef.current = newPos;
        }
      }

      if (fPosRef.current >= total) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [finish, stopRaf],
  );

  const play = useCallback(() => {
    const st = statusRef.current;
    if (st === "done" || st === "loading" || st === "idle") return;
    emit({
      status: "playing",
      chars: emittedRef.current,
      total: totalRef.current,
      progress: totalRef.current ? emittedRef.current / totalRef.current : 0,
      speed: speedRef.current,
    });
    lastTsRef.current = null;
    stopRaf();
    rafRef.current = requestAnimationFrame(tick);
  }, [emit, stopRaf, tick]);

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") return;
    stopRaf();
    const prog = totalRef.current ? emittedRef.current / totalRef.current : 0;
    lastUiProgressRef.current = prog;
    emit({
      status: "paused",
      chars: emittedRef.current,
      total: totalRef.current,
      progress: prog,
      speed: speedRef.current,
    });
  }, [emit, stopRaf]);

  const setSpeed = useCallback(
    (s: Speed) => {
      speedRef.current = s;
      // 速度即时生效：tick 每帧读 speedRef，无需重启 rAF
      emit({ speed: s });
    },
    [emit],
  );

  /** 从头开始回放（重新加载素材，清除全部输出） */
  const reload = useCallback(async () => {
    const epoch = ++epochRef.current;
    stopRaf();
    textRef.current = "";
    totalRef.current = 0;
    charpsRef.current = 0;
    emittedRef.current = 0;
    fPosRef.current = 0;
    charsRef.current = 0;
    lastUiProgressRef.current = 0;
    lastTsRef.current = null;
    emit({
      status: "loading",
      chars: 0,
      total: 0,
      progress: 0,
      speed: speedRef.current,
      error: null,
    });
    if (!appTextUrl) {
      emit({ status: "idle" });
      return;
    }
    try {
      const res = await fetch(appTextUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // 防止竞态：若期间又发起了新的 reload，丢弃本次结果
      if (epochRef.current !== epoch) return;
      textRef.current = text;
      totalRef.current = text.length;
      // 自适应速率：总字符数 ÷ 目标时长
      charpsRef.current = text.length / TARGET_DURATION_MS;
      emit({
        status: "buffering",
        chars: 0,
        total: text.length,
        progress: 0,
        speed: speedRef.current,
        error: null,
      });
    } catch (e) {
      emit({
        status: "idle",
        chars: 0,
        total: 0,
        progress: 0,
        speed: speedRef.current,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [appTextUrl, emit, stopRaf]);

  // 同步把状态推给订阅者（onChunk / onStatus），并更新 ref 供 rAF 读取
  useEffect(() => {
    statusRef.current = state.status;
    cbRef.current.onStatus(state);
  }, [state]);

  // 切换应用时彻底清理并重新加载
  useEffect(() => {
    reload();
    return () => stopRaf();
  }, [appTextUrl, reload, stopRaf]);

  return {
    state,
    play,
    pause,
    setSpeed,
    reload,
    /** 同步取当前已生成文本（供预览 iframe 使用） */
    getText: () => textRef.current.slice(0, emittedRef.current),
    reset: reload,
  };
}
