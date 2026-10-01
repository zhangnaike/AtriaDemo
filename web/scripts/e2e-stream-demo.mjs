/* 端到端运行时验证：用 jsdom 真实渲染 StreamDemo 组件。
 * 覆盖：流式追加、预览 srcdoc 联动、速度切换即时生效、重播、应用切换清理。
 */
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { act } from "react";

// ---- jsdom 环境 ----
const dom = new JSDOM("<!DOCTYPE html><html><body><div id='r'></div></body></html>", {
  url: "http://localhost:3000/",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLDivElement = dom.window.HTMLDivElement;
globalThis.HTMLIFrameElement = dom.window.HTMLIFrameElement;
globalThis.Node = dom.window.Node;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.fetch = async (url) => {
  const text = readFileSync("public" + url, "utf8");
  await new Promise((r) => setTimeout(r, 30));
  return { ok: true, status: 200, text: () => Promise.resolve(text) };
};

// stub: next/link 与 lucide-react 在 jsdom 环境下不需要真实样式/路由
const stubMod = {
  default: new Proxy(
    {},
    {
      get: (_t, tag) => {
        if (tag === "__esModule") return true;
        return (props) =>
          React.createElement(
            String(tag),
            Object.assign({}, props, { "data-stub": String(tag) }),
            props?.children,
          );
      },
    },
  ),
};
globalThis.__stubs = stubMod;

const { StreamDemo } = await import("../.e2e-tmp/StreamDemo.js");

const failures = [];
const ok = (name, cond, extra = "") => {
  console.log((cond ? "  PASS " : "  FAIL ") + name + (extra ? "  " + extra : ""));
  if (!cond) failures.push(name);
};

// stub react-dom/client 在 jsdom 下的 createRoot
const container = document.getElementById("r");
const root = createRoot(container);

await act(async () => {
  root.render(React.createElement(StreamDemo));
});

// 等待 fetch 完成 + 自动播放
await act(async () => {
  await new Promise((r) => setTimeout(r, 500));
});

const totalChars = readFileSync("public/text/breakout.txt", "utf8").length;
ok("初始加载完成", container.textContent.includes("生成流"));
ok("自动开始播放", container.textContent.includes("生成中"), "");

// ---- 快进到某个进度 ----
await act(async () => {
  await new Promise((r) => setTimeout(r, 3000));
});
const codeEl = container.querySelector(".codestream");
const renderedChars = codeEl ? codeEl.textContent.length : 0;
ok("流式追加已开始", renderedChars > 100, `已渲染约 ${renderedChars} 字符`);

// ---- 速度切换即时生效 ----
const speed8 = [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "8x");
await act(async () => {
  speed8.click();
});
await act(async () => {
  await new Promise((r) => setTimeout(r, 1500));
});
const charsAt8x = container.querySelector(".codestream").textContent.length;
ok("8x 切换后仍在推进", charsAt8x > renderedChars, `${renderedChars} -> ${charsAt8x}`);

// ---- iframe srcdoc 联动（throttle 间隔 1.6s，需等足） ----
await act(async () => {
  await new Promise((r) => setTimeout(r, 4000));
});
const frame = container.querySelector("iframe");
ok("iframe 存在", !!frame);
const srcdocNow = frame ? frame.getAttribute("srcdoc") || "" : "";
const srcdocLen = srcdocNow.length;
ok("srcdoc 已写入预览", srcdocLen > 0, `srcdoc 长度 ${srcdocLen}`);
// srcdoc 内容应该是「已生成代码的前缀」（sanitize 后）
const codeNow = readFileSync("public/text/breakout.txt", "utf8");
const prefixOk = srcdocNow.length > 0 && srcdocNow.startsWith("<");
ok("srcdoc 内容是代码前缀", srcdocNow.length > 0 && codeNow.startsWith(srcdocNow.slice(0, Math.min(200, srcdocNow.length))), "");

// ---- 重播 ----
const replayBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("重播"));
await act(async () => {
  replayBtn.click();
});
await act(async () => {
  await new Promise((r) => setTimeout(r, 800));
});
const afterReplay = container.querySelector(".codestream").textContent.length;
ok("重播后重新开始", afterReplay < charsAt8x, `重播后 ${afterReplay} < ${charsAt8x}`);

// ---- 应用切换：彻底清理 ----
const dashCard = [...container.querySelectorAll("button")].find((b) =>
  b.textContent.includes("数据看板"),
);
await act(async () => {
  dashCard.click();
});
await act(async () => {
  await new Promise((r) => setTimeout(r, 1200));
});
const dashText = readFileSync("public/text/dashboard.txt", "utf8");
const codeAfter = container.querySelector(".codestream").textContent;
const contaminated = dashText.split("\n").some((l) => l.length > 5 && codeAfter.includes(l.slice(0, 20)));
ok("切换应用后代码流已清空（无残留）", !contaminated, contaminated ? "发现残留" : "");

console.log("--- 第一阶段完成 ---");

// ============= 第二阶段：完成态 + 暂停 =============
// 快进到完成
const speedBtns = [...container.querySelectorAll("button")].filter((b) => /^\dx$/.test(b.textContent.trim()));
const s8 = speedBtns.find((b) => b.textContent.trim() === "8x");
await act(async () => { s8.click(); });
let waited = 0;
while (waited < 30000) {
  await act(async () => { await new Promise((r) => setTimeout(r, 1000)); });
  waited += 1000;
  if (container.textContent.includes("渲染完成")) break;
}
ok("达到完成态（渲染完成）", container.textContent.includes("渲染完成"), `等待 ${waited / 1000}s`);
console.log("  调试: 完成态文本含「生成完成」:", container.textContent.includes("生成完成"));
console.log("  调试: status 文本:", (container.textContent.match(/(生成完成|生成中|等待)/) || ["?"])[0]);
const frameDone = container.querySelector("iframe");
const finalSrc = frameDone.getAttribute("src") || "";
const finalSrcdoc = frameDone.getAttribute("srcdoc") || "";
ok("完成后切换到正式 src", finalSrc.includes("/apps/"), JSON.stringify(finalSrc));
ok("完成态显示「在新窗口打开」", container.textContent.includes("在新窗口打开"));

// 代码流应该是完整的
const finalCode = container.querySelector(".codestream").textContent;
const fullText = readFileSync("public/text/breakout.txt", "utf8");
ok("完成态代码完整", finalCode.length >= fullText.length * 0.98, `${finalCode.length} / ${fullText.length}`);

// 暂停功能
const replayBtn2 = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("重播"));
await act(async () => { replayBtn2.click(); });
await act(async () => { await new Promise((r) => setTimeout(r, 800)); });
const pauseBtn2 = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("暂停"));
ok("播放中显示「暂停」按钮", !!pauseBtn2);
if (pauseBtn2) {
  await act(async () => { pauseBtn2.click(); });
  const mid = container.querySelector(".codestream").textContent.length;
  await act(async () => { await new Promise((r) => setTimeout(r, 1500)); });
  const afterPause = container.querySelector(".codestream").textContent.length;
  ok("暂停后停止推进", Math.abs(afterPause - mid) < 200, `${mid} -> ${afterPause}`);
  const playBtn2 = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("播放"));
  ok("暂停后显示「播放」按钮", !!playBtn2);
  if (playBtn2) {
    await act(async () => { playBtn2.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 800)); });
    const resumed = container.querySelector(".codestream").textContent.length;
    ok("恢复播放后继续推进", resumed > afterPause + 100, `${afterPause} -> ${resumed}`);
  }
}

console.log(failures.length === 0 ? "ALL PASS (含完成态与暂停)" : `\n${failures.length} FAILURES: ${failures.join(", ")}`);
process.exit(failures.length === 0 ? 0 : 1);
