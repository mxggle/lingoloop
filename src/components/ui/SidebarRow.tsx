import React from "react";
import { cn } from "../../utils/cn";

interface SidebarRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  primaryText: React.ReactNode;
  secondaryText?: React.ReactNode;
  isActive?: boolean;
  depth?: number;
  actions?: React.ReactNode;
  containerClassName?: string;
  contentClassName?: string;
}

export const SidebarRow = React.forwardRef<HTMLButtonElement, SidebarRowProps>(
  (
    {
      icon,
      primaryText,
      secondaryText,
      isActive,
      depth = 0,
      actions,
      className,
      containerClassName,
      contentClassName,
      children,
      ...props
    },
    ref
  ) => {
    const INDENT_PX = 20;
    const BASE_PX = 8;

    return (
      <div className={cn("group relative w-full", containerClassName)}>
        <button
          ref={ref}
          className={cn(
            "w-full flex items-center h-[28px] text-left transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-500",
            isActive
              ? "bg-primary-500/12 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300 font-semibold"
              : "text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5",
            className
          )}
          style={{ paddingLeft: BASE_PX + depth * INDENT_PX }}
          {...props}
        >
          {icon && <div className="shrink-0 mr-2 flex items-center justify-center w-4 h-4">{icon}</div>}
          
          <div className={cn("flex-1 min-w-0 flex flex-col justify-center", contentClassName)}>
            <span className="text-xs truncate leading-tight">
              {primaryText}
            </span>
            {secondaryText && (
              <span className="text-[10px] truncate opacity-60 font-mono leading-tight">
                {secondaryText}
              </span>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-0.5 px-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              {actions}
            </div>
          )}
          
          {children}
        </button>
      </div>
    );
  }
);

SidebarRow.displayName = "SidebarRow";
