import type { LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";

export type SettingsTab = "general" | "ai";

export interface SettingsSidebarItem {
  id: SettingsTab;
  label: string;
  description: string;
  Icon: LucideIcon;
}

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  items: SettingsSidebarItem[];
  onTabChange: (tab: SettingsTab) => void;
  orientation?: "horizontal" | "vertical";
  variant?: "page" | "standalone";
  className?: string;
}

export function SettingsSidebar({
  activeTab,
  items,
  onTabChange,
  orientation = "vertical",
  variant = "page",
  className,
}: SettingsSidebarProps) {
  return (
    <nav
      className={cn(
        orientation === "vertical"
          ? variant === "standalone"
            ? "flex flex-col gap-2"
            : "flex flex-col gap-2 rounded-3xl border border-black/5 bg-white/60 p-3 backdrop-blur-sm dark:border-white/5 dark:bg-gray-900/50"
          : "flex gap-1.5 rounded-2xl bg-black/5 p-1.5 dark:bg-white/5",
        className
      )}
      aria-label="Settings navigation"
    >
      {items.map(({ id, label, description, Icon }) => {
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "transition-all duration-200",
              orientation === "vertical"
                ? cn(
                    "flex w-full items-start gap-3 rounded-2xl px-4 py-4 text-left",
                    variant === "standalone"
                      ? isActive
                        ? "border border-primary-200 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-100"
                        : "border border-transparent text-gray-500 hover:border-black/5 hover:bg-white/70 hover:text-gray-900 dark:text-gray-400 dark:hover:border-white/5 dark:hover:bg-white/[0.04] dark:hover:text-white"
                      : isActive
                        ? "bg-primary-500 text-white shadow-lg shadow-primary-500/10"
                        : "text-gray-500 hover:bg-black/[0.03] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white"
                  )
                : cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide",
                    isActive
                      ? "bg-white text-primary-600 shadow-sm dark:bg-gray-700 dark:text-white"
                      : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  )
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", orientation === "vertical" && "mt-0.5")} />
            <span className={cn(orientation === "vertical" ? "space-y-1" : "truncate")}>
              <span
                className={cn(
                  "block",
                  orientation === "vertical"
                    ? "text-sm font-bold uppercase tracking-wide"
                    : "text-xs"
                )}
              >
                {label}
              </span>
              {orientation === "vertical" ? (
                <span
                  className={cn(
                    "block text-[11px] font-medium leading-relaxed",
                    variant === "standalone"
                      ? isActive
                        ? "text-primary-600 dark:text-primary-200"
                        : "text-gray-400 dark:text-gray-500"
                      : isActive
                        ? "text-primary-100"
                        : "text-gray-400"
                  )}
                >
                  {description}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
