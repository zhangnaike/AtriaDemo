/**
 * 流式回放 demo 的应用元数据。
 *
 * 三个素材均已在 public/ 下核实：
 *   public/text/<id>.txt         —— 回放所用的源码文本（与正式 html 逐字节一致）
 *   public/apps/<id>/index.html  —— 完成态 iframe 加载的正式应用
 */

/** 1x 回放的目标总时长（ms），落在需求的 75-90s 区间内。 */
export const TARGET_DURATION_MS = 82_000;

export type AppAccent = "amber" | "cyan" | "orange";

export interface DemoApp {
  id: string;
  /** 卡片显示名 */
  name: string;
  /** 一句话「生成 prompt」 */
  prompt: string;
  /** 卡片图标 key（在 AppSelector 内映射到 lucide 图标） */
  icon: "gamepad" | "chart" | "pen";
  accent: AppAccent;
  /** 回放文本 URL */
  textUrl: string;
  /** 完成态应用 URL */
  appUrl: string;
  /** 卡片角标：行数 · 体积 */
  meta: string;
}

export const DEMO_APPS: readonly DemoApp[] = [
  {
    id: "breakout",
    name: "Breakout 游戏",
    prompt: "用一个 HTML 文件实现一个霓虹风格的打砖块游戏，带粒子爆破和连击系统",
    icon: "gamepad",
    accent: "amber",
    textUrl: "/text/breakout.txt",
    appUrl: "/apps/breakout/index.html",
    meta: "727 行 · 25 KB",
  },
  {
    id: "dashboard",
    name: "数据看板",
    prompt: "为虚构产品 Lumen Analytics 做一个实时运营数据看板，SVG 折线图加环形图",
    icon: "chart",
    accent: "cyan",
    textUrl: "/text/dashboard.txt",
    appUrl: "/apps/dashboard/index.html",
    meta: "722 行 · 31 KB",
  },
  {
    id: "landing",
    name: "品牌官网",
    prompt: "为 AI 写作工具 Quill 设计一个黑色高级感的品牌官网首页，带打字机动效",
    icon: "pen",
    accent: "orange",
    textUrl: "/text/landing.txt",
    appUrl: "/apps/landing/index.html",
    meta: "502 行 · 26 KB",
  },
];

export function getApp(id: string): DemoApp {
  const app = DEMO_APPS.find((a) => a.id === id);
  if (!app) throw new Error(`Unknown demo app: ${id}`);
  return app;
}
