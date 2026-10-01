/**
 * 把「流式回放到一半的 HTML 文本」安全地塞进 iframe。
 *
 * 为什么需要处理：
 *   浏览器 HTML 解析器对未闭合标签有标准自愈（<div> 没闭合会自动补），
 *   <style> 里的残缺规则也会被忽略，这些都不用管。唯一真正会出问题的是
 *   <script>：写了一半的 JS 会让 iframe 抛 syntax error，并阻塞后续渲染。
 *
 * 策略（刻意保真、不重排、不改字符顺序）：
 *   只移除「未闭合的 script 及其之后的全部内容」。
 *   完整的 <script>...</script> 对原样保留。
 *   因此流式过程中预览呈现「样式先成形、行为最后注入」的观感，
 *   与「代码边写、应用边成形」的叙事一致。
 */

const EMPTY_DOC =
  "<!DOCTYPE html><html><head><meta charset=\"utf-8\">" +
  "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
  "</head><body></body></html>";

export interface SanitizeResult {
  /** 可直接写入 iframe srcdoc 的文本 */
  doc: string;
  /** 是否已经是一个完整文档（true 时可直接原样写入） */
  isComplete: boolean;
}

const SCRIPT_PAIR_RE = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;

/**
 * 从右向左扫：只要存在未配对的 <script>，就从该 <script> 处截断。
 * 返回的 doc 可能仍含未闭合标签 —— 那是浏览器自愈的职责。
 */
export function sanitizePartialHtml(raw: string): SanitizeResult {
  if (!raw) return { doc: EMPTY_DOC, isComplete: false };

  let cut = raw.length;
  let searchFrom = 0;

  for (;;) {
    const openAt = findOpenScript(raw, searchFrom, cut);
    if (openAt === -1) break;

    // 在 [openAt, cut) 内找关闭标签
    const closeAt = findCloseScript(raw, openAt, cut);
    if (closeAt === -1) {
      // 未闭合：砍掉这个 script 的开标签及之后全部
      cut = openAt;
      break;
    }
    // 这对 script 完整，继续往后找
    searchFrom = closeAt;
  }

  if (cut === raw.length) return { doc: raw, isComplete: true };
  return { doc: raw.slice(0, cut), isComplete: false };
}

function findOpenScript(text: string, from: number, to: number): number {
  for (let i = from; i < to; i++) {
    if (text[i] === "<" && text.startsWith("script", i + 1)) {
      // 确认是开标签而非 </script
      const after = text[i + 7];
      if (after === ">" || after === " " || after === "\t" || after === "\n") {
        return i;
      }
    }
  }
  return -1;
}

function findCloseScript(text: string, openAt: number, to: number): number {
  for (let i = openAt; i < to; i++) {
    if (text[i] === "<" && text[i + 1] === "/" && text.startsWith("script", i + 2)) {
      const end = text.indexOf(">", i);
      return end === -1 ? -1 : end + 1;
    }
  }
  return -1;
}

void SCRIPT_PAIR_RE;
