"use client";

import { memo } from "react";
import { Gamepad2, BarChart3, PenLine } from "lucide-react";
import type { DemoApp } from "./apps";

const ICONS = {
  gamepad: Gamepad2,
  chart: BarChart3,
  pen: PenLine,
} as const;

const ACCENT = {
  amber: { text: "text-ink-amber", border: "border-ink-amber", glow: "bg-ink-amber" },
  cyan: { text: "text-ink-cyan", border: "border-ink-cyan", glow: "bg-ink-cyan" },
  orange: { text: "text-ink-orange", border: "border-ink-orange", glow: "bg-ink-orange" },
} as const;

interface Props {
  apps: readonly DemoApp[];
  currentId: string;
  onPick: (id: string) => void;
}

export function AppSelector({ apps, currentId, onPick }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {apps.map((app) => {
        const Icon = ICONS[app.icon];
        const accent = ACCENT[app.accent];
        const active = app.id === currentId;
        return (
          <button
            key={app.id}
            type="button"
            onClick={() => onPick(app.id)}
            className={[
              "group relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-all duration-200",
              active
                ? "border-ink-amber bg-ink-panel shadow-lg shadow-orange-500/10"
                : "border-ink-line bg-ink-panel/50 hover:border-ink-fg-faint hover:bg-ink-panel",
            ].join(" ")}
            aria-pressed={active}
          >
            <div className="flex items-center gap-2">
              <Icon className={["h-4 w-4", active ? accent.text : "text-ink-fg-faint"].join(" ")} />
              <span
                className={[
                  "text-sm font-medium",
                  active ? "text-ink-fg" : "text-ink-fg-dim",
                ].join(" ")}
              >
                {app.name}
              </span>
              <span className="ml-auto text-[10px] text-ink-fg-faint">{app.meta}</span>
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-ink-fg-faint">
              {app.prompt}
            </p>
            {active && (
              <span className="absolute -top-px left-4 right-4 h-px bg-dawn" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export const AppSelectorMemo = memo(AppSelector);
export default AppSelector;
