"use client";

import { memo, useEffect, useRef } from "react";
import { tokenizeLine, type Token, type TokenKind } from "./highlight";

/* ============================================================
   命令式流式代码渲染器
   ------------------------------------------------------------
   核心矛盾：全量 innerHTML 重渲染 = O(已输出字符数)。
   文本到 30KB 时每帧重写整棵 DOM 树，必然掉帧。

   解法：
     1. 每一行 = 一个 <div class="ln">；
     2. 「进行中的行」每帧只重写自己的 innerHTML（只有它在变）；
     3. 一旦遇到换行，该行立即 freeze：innerHTML 定型，之后永不触碰；
     4. 行号用 CSS counter 生成，不占 DOM 文本节点。
   每帧成本 = O(当前行宽)，与已输出总字符数无关。
   ============================================================ */

const COLORS: Record<TokenKind, string> = {
  plain: "",
  comment: "color:#6b6660",
  tag: "color:#fbbf24",
  attr: "color:#fb923c",
  string: "color:#a3d68a",
  punct: "color:#8a857d",
  keyword: "color:#22d3ee",
  number: "color:#f97316",
  fn: "color:#60a5fa",
  cssprop: "color:#fb923c",
  csssel: "color:#fbbf24",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderLine(text: string): string {
  const tokens = tokenizeLine(text);
  let html = "";
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const color = COLORS[t.kind];
    if (color === "") {
      html += esc(t.value);
    } else {
      html += '<span style="' + color + '">' + esc(t.value) + "</span>";
    }
  }
  return html;
}

export interface CodeStreamHandle {
  clear: () => void;
  /**
   * 追加渲染文本片段。
   * 必须严格按顺序追加（切换应用前先 clear），否则忽略。
   */
  append: (chunk: string) => void;
}

export interface CodeStreamProps {
  className?: string;
  onReady?: (handle: CodeStreamHandle | null) => void;
}

function CodeStreamInner(props: CodeStreamProps) {
  const ref = useRef<HTMLDivElement>(null);
  // onReady 用 ref 保存最新引用，避免它成为 effect 依赖
  const onReadyRef = useRef(props.onReady);
  onReadyRef.current = props.onReady;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const active: { div: HTMLDivElement } = { div: null as never };
    let activeDiv: HTMLDivElement | null = null;
    let activeText = "";

    const newLine = (text: string, isActive: boolean) => {
      const div = document.createElement("div");
      div.className = isActive ? "ln ln-active" : "ln";
      div.innerHTML = renderLine(text);
      el.appendChild(div);
      return div;
    };

    const handle: CodeStreamHandle = {
      clear() {
        el.textContent = "";
        activeDiv = null;
        activeText = "";
      },
      append(chunk: string) {
        if (!chunk) return;
        const buffer = activeDiv === null ? chunk : activeText + chunk;

        const parts = buffer.split("\n");
        const tail = parts.pop() as string;

        for (let i = 0; i < parts.length; i++) {
          if (activeDiv !== null) {
            // 进行中行收到换行：定型为完成行
            activeDiv.className = "ln";
            activeDiv.innerHTML = renderLine(parts[i]);
            activeDiv = null;
            activeText = "";
          } else {
            newLine(parts[i], false);
          }
        }

        // 进行中行
        if (activeDiv !== null) {
          activeText = tail;
          activeDiv.innerHTML = renderLine(tail);
        } else {
          activeDiv = newLine(tail, true);
          activeText = tail;
        }
      },
    };
    void active;

    onReadyRef.current?.(handle);
    return () => {
      onReadyRef.current?.(null);
      el.textContent = "";
    };
    // 只在挂载时建立 handle；onReady 经 ref 取最新值，
    // 不会因父组件重渲染而清空重建（历史上 deps=[props] 导致的死循环 bug）。
  }, []);

  return (
    <div
      ref={ref}
      className={["codestream", props.className].filter(Boolean).join(" ")}
      role="textbox"
      aria-readonly="true"
    />
  );
}

export const CodeStream = memo(CodeStreamInner);
export default CodeStream;
