import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface SettingsRowProps {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  noBorder?: boolean;
}

export function SettingsRow({
  label,
  description,
  children,
  className,
  noBorder = false,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 py-4",
        !noBorder && "border-b border-gray-100 dark:border-gray-800",
        className
      )}
    >
      <div className="flex-1 space-y-0.5 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </p>
        {description ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
