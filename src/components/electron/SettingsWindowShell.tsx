import type { ReactNode } from "react";

interface SettingsWindowShellProps {
  title: string;
  subtitle: string;
  navigation: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export function SettingsWindowShell({
  title,
  subtitle,
  navigation,
  footer,
  children,
}: SettingsWindowShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_42%),linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(241,245,249,0.96))] p-4 text-gray-900 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_36%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.98))] dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white/80 shadow-[0_32px_90px_-40px_rgba(15,23,42,0.5)] backdrop-blur-2xl dark:border-white/10 dark:bg-gray-950/80 dark:shadow-black/50">
        <header className="border-b border-black/5 px-6 py-5 dark:border-white/5">
          <div className="[-webkit-app-region:drag] space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {title}
            </h1>
            <p className="max-w-2xl text-sm font-medium text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-r border-black/5 bg-black/[0.02] px-4 py-5 dark:border-white/5 dark:bg-white/[0.02]">
            {navigation}
          </aside>

          <main className="min-h-0 overflow-y-auto px-6 py-6 md:px-8 md:py-7">
            {children}
          </main>
        </div>

        <footer className="border-t border-black/5 bg-white/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.03]">
          {footer}
        </footer>
      </div>
    </div>
  );
}
