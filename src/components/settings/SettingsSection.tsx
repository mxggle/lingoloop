import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  icon,
  action,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="shrink-0">{icon}</span>
          ) : null}
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
