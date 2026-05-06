import { Minus, Square, X } from "lucide-react";
import { cn } from "../../utils/cn";

interface PanelHeaderProps {
  title: string;
  onCollapse?: () => void;
  onExpand?: () => void;
  onHide?: () => void;
  collapsed?: boolean;
  className?: string;
}

export const PanelHeader = ({
  title,
  onCollapse,
  onExpand,
  onHide,
  collapsed = false,
  className,
}: PanelHeaderProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-white/5 select-none",
        className
      )}
    >
      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
        {title}
      </span>
      <div className="flex items-center gap-0.5">
        {collapsed ? (
          <button
            onClick={onExpand}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Expand"
          >
            <Square size={12} />
          </button>
        ) : (
          <button
            onClick={onCollapse}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Collapse"
          >
            <Minus size={12} />
          </button>
        )}
        <button
          onClick={onHide}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Hide"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
