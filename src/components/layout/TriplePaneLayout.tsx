import React from "react";
import { cn } from "../../utils/cn";

interface TriplePaneLayoutProps {
  /** Pane 1: Navigation Sidebar (left) */
  sidebar: React.ReactNode;
  /** Pane 2: Middle List/Selection (optional) */
  list?: React.ReactNode;
  /** Pane 3: Main Detail/Content (right) */
  content: React.ReactNode;
  /** Header slot for the whole layout */
  header?: React.ReactNode;
  /** Footer slot for the whole layout */
  footer?: React.ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Whether the middle list pane is visible */
  showList?: boolean;
}

/**
 * A reusable triple-pane layout for desktop-first interfaces.
 * Pane 1 (Sidebar): Fixed width, navigation.
 * Pane 2 (List): Middle column for selection (optional).
 * Pane 3 (Content): Main scrollable content area.
 */
export function TriplePaneLayout({
  sidebar,
  list,
  content,
  header,
  footer,
  className,
  showList = true,
}: TriplePaneLayoutProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white/40 shadow-2xl backdrop-blur-3xl dark:border-white/5 dark:bg-gray-950/40",
        className
      )}
    >
      {/* Optional Header */}
      {header && (
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 p-6 dark:border-white/5">
          {header}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Pane 1: Navigation Sidebar */}
        <aside className="w-64 shrink-0 border-r border-black/5 bg-black/[0.02] p-6 dark:border-white/5 dark:bg-white/[0.02]">
          {sidebar}
        </aside>

        {/* Pane 2: Middle List (Optional) */}
        {list && showList && (
          <aside className="w-72 shrink-0 border-r border-black/5 bg-black/[0.01] p-4 dark:border-white/5 dark:bg-white/[0.01]">
            <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
              {list}
            </div>
          </aside>
        )}

        {/* Pane 3: Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
          <div className="mx-auto max-w-4xl">{content}</div>
        </main>
      </div>

      {/* Optional Footer */}
      {footer && (
        <footer className="flex shrink-0 items-center justify-between border-t border-black/5 bg-black/[0.03] p-4 px-8 dark:border-white/5 dark:bg-white/[0.03]">
          {footer}
        </footer>
      )}
    </div>
  );
}

interface TriplePaneHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function TriplePaneHeader({
  title,
  subtitle,
  icon,
  actions,
}: TriplePaneHeaderProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        {icon && <div className="text-primary-500">{icon}</div>}
        <div className="space-y-0.5">
          <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 opacity-60">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </>
  );
}
