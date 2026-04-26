import React from "react";
import { cn } from "../../utils/cn";

interface DesktopCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const DesktopCard = React.forwardRef<HTMLDivElement, DesktopCardProps>(
  ({ glass = true, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border transition-all duration-300",
          glass
            ? "bg-white/80 dark:bg-gray-900/85 backdrop-blur-xl border-black/10 dark:border-white/10 shadow-lg"
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DesktopCard.displayName = "DesktopCard";

export const DesktopCardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 py-4 border-b border-black/5 dark:border-white/5", className)} {...props}>
    {children}
  </div>
);

export const DesktopCardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...props}>
    {children}
  </div>
);

export const DesktopCardFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 py-4 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]", className)} {...props}>
    {children}
  </div>
);
