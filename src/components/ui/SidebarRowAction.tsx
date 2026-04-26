import React from "react";
import { cn } from "../../utils/cn";

interface SidebarRowActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: "default" | "error" | "accent";
}

export const SidebarRowAction = React.forwardRef<HTMLButtonElement, SidebarRowActionProps>(
  ({ icon, variant = "default", className, title, ...props }, ref) => {
    const variants = {
      default: "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5",
      error: "text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-950/30",
      accent: "text-gray-400 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/30",
    };

    return (
      <button
        ref={ref}
        type="button"
        title={title}
        aria-label={title}
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-primary-500",
          variants[variant],
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          props.onClick?.(e);
        }}
        {...props}
      >
        {React.cloneElement(icon as React.ReactElement, { size: 14 })}
      </button>
    );
  }
);

SidebarRowAction.displayName = "SidebarRowAction";
