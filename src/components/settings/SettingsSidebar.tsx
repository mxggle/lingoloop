import type { LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";

type SettingsTab = "general" | "ai";

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
  className?: string;
}

export function SettingsSidebar({
  activeTab,
  items,
  onTabChange,
  orientation = "vertical",
  className,
}: SettingsSidebarProps) {
  return (
    <nav
      className={cn(
        orientation === "vertical"
          ? "flex flex-col gap-2 rounded-3xl border border-black/5 bg-white/60 p-3 backdrop-blur-sm dark:border-white/5 dark:bg-gray-900/50"
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
            className={cn(
              "transition-all duration-300",
              orientation === "vertical"
                ? cn(
                    "flex items-start gap-3 rounded-2xl px-4 py-4 text-left",
                    isActive
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
                    isActive ? "text-primary-100" : "text-gray-400"
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
