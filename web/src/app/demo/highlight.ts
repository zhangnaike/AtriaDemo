/**
 * 极简 HTML/JS/CSS 语法高亮。
 *
 * 设计目标：单次正则扫描把一行切成 token 数组，绝不拆分字符、绝不回溯。
 * 高亮结果按「行」 memo 化 —— 回放过程中一行只在「写完的那一刻」高亮一次，
 * 之后整行不可变，滚动/重渲染都不会重复 tokenize。
 *
 * 之所以不引入 prism / shiki：
 *   1. 素材是单文件 HTML（内联 CSS + 内联 JS），正则覆盖 90%+ 观感；
 *   2. 每帧都在追加新字符，任何重量级 parser 都会拖垮 60fps。
 */

export type TokenKind =
  | "plain"
  | "comment"
  | "tag"
  | "attr"
  | "string"
  | "punct"
  | "keyword"
  | "number"
  | "fn"
  | "cssprop"
  | "csssel";

export interface Token {
  kind: TokenKind;
  value: string;
}

const HTML_RE =
  /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][\w:-]*)|("[^"]*"|'[^']*')|([A-Za-z-]+)(?==)|(\/?>)/g;

/**
 * 注意：JS_KEYWORDS 故意不带 g 标志。
 * 带 g 的正则用 .test() 时 lastIndex 会跨调用累积，
 * 导致「上次匹配完的位置」污染下一次判断（本文件历史上的真实 bug）。
 */
const JS_KEYWORDS =
  /\b(?:var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|super|typeof|instanceof|in|of|delete|void|null|undefined|true|false|try|catch|finally|throw|static|get|set|async|await|yield|import|export|from|as|default|type|interface|enum|implements|public|private|protected|readonly|namespace|declare|abstract|module|is|keyof|never|unknown|any|string|number|boolean|object)\b/;

/**
 * token 化一行。
 *
 * 策略：HTML 模式（标签/属性/字符串/注释）优先，JS 关键字/数字/函数调用次之。
 * 不维护跨行状态 —— 对内联 <style>/<script> 的多行注释会有零星误判，
 * 但回放画面更像「真实 streaming」，无需完美。
 */
export function tokenizeLine(line: string): Token[] {
  if (!line) return [];

  const tokens: Token[] = [];
  let last = 0;

  // 粗粒度分段：先按 HTML 边界切，段内再做 JS/CSS 级别的上色
  HTML_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = HTML_RE.exec(line)) !== null) {
    if (m.index > last) {
      pushSegment(tokens, line.slice(last, m.index));
    }
    if (m[1] !== undefined) {
      tokens.push({ kind: "comment", value: m[1] });
    } else if (m[2] !== undefined) {
      tokens.push({ kind: "tag", value: m[2] });
    } else if (m[3] !== undefined) {
      tokens.push({ kind: "string", value: m[3] });
    } else if (m[4] !== undefined) {
      tokens.push({ kind: "attr", value: m[4] });
    } else if (m[5] !== undefined) {
      tokens.push({ kind: "punct", value: m[5] });
    }
    last = HTML_RE.lastIndex;
  }

  if (last < line.length) {
    pushSegment(tokens, line.slice(last));
  }

  return mergePlain(tokens);
}

function pushSegment(tokens: Token[], segment: string): void {
  // 段内再做一次 JS/CSS 级别的切分
  const seg = segment;
  let i = 0;
  const n = seg.length;
  let buf = "";
  const flush = () => {
    if (buf) {
      tokens.push({ kind: "plain", value: buf });
      buf = "";
    }
  };

  while (i < n) {
    const ch = seg[i];

    // 行注释 //
    if (ch === "/" && seg[i + 1] === "/") {
      flush();
      tokens.push({ kind: "comment", value: seg.slice(i) });
      return;
    }
    // 字符串。注意：HTML_RE 跳过的「洞」里可能只有单个引号（另一半在
    // 相邻 token 里），找不到闭合就按普通字符处理，否则会吞掉整段后续内容。
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = findStringEnd(seg, i);
      if (end < seg.length || (end === seg.length && seg[end - 1] === ch)) {
        flush();
        tokens.push({ kind: "string", value: seg.slice(i, end) });
        i = end;
        continue;
      }
      // 未闭合：当作普通字符
    }
    // 标识符
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      while (i < n && /[\w$]/.test(seg[i])) i++;
      const word = seg.slice(start, i);
      if (JS_KEYWORDS.test(word)) {
        flush();
        tokens.push({ kind: "keyword", value: word });
      } else if (seg[i] === "(") {
        flush();
        tokens.push({ kind: "fn", value: word });
      } else {
        buf += word;
      }
      continue;
    }
    // 数字
    if (/[0-9]/.test(ch)) {
      const start = i;
      while (i < n && /[0-9a-fxA-FX._]/.test(seg[i])) i++;
      flush();
      tokens.push({ kind: "number", value: seg.slice(start, i) });
      continue;
    }

    buf += ch;
    i++;
  }
  flush();
}

function findStringEnd(seg: string, start: number): number {
  const quote = seg[start];
  let i = start + 1;
  while (i < seg.length) {
    if (seg[i] === "\\") {
      i += 2;
      continue;
    }
    if (seg[i] === quote) return i + 1;
    i++;
  }
  return seg.length;
}

/** 合并相邻的 plain，减少 token 数量 */
function mergePlain(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === "plain" && t.kind === "plain") {
      prev.value += t.value;
    } else {
      out.push(t);
    }
  }
  return out;
}
