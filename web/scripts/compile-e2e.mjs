#!/usr/bin/env node
/**
 * 编译 src/app/demo 的组件到 .e2e-tmp，供 scripts/e2e-stream-demo.mjs 使用。
 * next/link 与 lucide-react 用 stub 替代（jsdom 环境不需要真实样式/路由）。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, readdirSync, readFileSync } from "node:fs";

const TMP = ".e2e-tmp";

if (existsSync(TMP)) {
  console.log(".e2e-tmp 已存在，跳过编译（删除后可重新生成）");
  process.exit(0);
}

mkdirSync(TMP + "/stub", { recursive: true });

const r = spawnSync(
  "npx",
  [
    "tsc",
    "src/app/demo/*.tsx",
    "src/app/demo/*.ts",
    "--outDir",
    TMP,
    "--target",
    "es2022",
    "--module",
    "es2022",
    "--moduleResolution",
    "bundler",
    "--jsx",
    "react-jsx",
    "--strict",
    "false",
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { stdio: "inherit", shell: true },
);
if (r.status !== 0) process.exit(r.status ?? 1);

writeFileSync(
  TMP + "/stub/next-link.js",
  'import React from "react";\nexport default function Link(props) {\n  return React.createElement("a", { href: props.href, "data-stub": "link" }, props.children);\n}\n',
);

const ICONS = [
  "ArrowLeft", "ArrowRight", "Terminal", "Eye", "Check", "Gamepad2",
  "BarChart3", "PenLine", "Play", "Pause", "RotateCcw", "ExternalLink", "Sparkles",
];
writeFileSync(
  TMP + "/stub/lucide.js",
  'import React from "react";\n'
    + 'const make = (name) => (props) => React.createElement("span", { "data-stub": name, "aria-hidden": true });\n'
    + ICONS.map((i) => `export const ${i} = make("${i}");`).join("\n")
    + "\n",
);

for (const f of readdirSync(TMP).filter((f) => f.endsWith(".js"))) {
  const path = `${TMP}/${f}`;
  let s = readFileSync(path, "utf8");
  s = s.replace(/from "next\/link"/g, 'from "./stub/next-link.js"');
  s = s.replace(/from "lucide-react"/g, 'from "./stub/lucide.js"');
  s = s.replace(/from "\.\/([A-Za-z0-9_-]+)"/g, 'from "./$1.js"');
  writeFileSync(path, s);
}

console.log("编译完成 ->", TMP);
