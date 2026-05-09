import { ChevronDown, Minus, X } from "lucide-react";
import { cn } from "../../utils/cn";

interface PanelHeaderProps {
  title: string;
  onCollapse?: () => void;
  onHide?: () => void;
  className?: string;
}

export const PanelHeader = ({
  title,
  onCollapse,
  onHide,
  className,
}: PanelHeaderProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-white/5 select-none min-w-0 shrink-0",
        className
      )}
    >
      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate min-w-0 mr-2">
        {title}
      </span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={onCollapse}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Collapse"
        >
          <Minus size={12} />
        </button>
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

/** Horizontal strip shown when outer panel collapses (e.g. transcript-alone or video-alone). */
export const CollapsedHorizontalStrip = ({
  title,
  onExpand,
  onHide,
  className,
}: {
  title: string;
  onExpand: () => void;
  onHide: () => void;
  className?: string;
}) => (
  <div
    className={cn(
      "flex items-center h-full px-3 gap-2 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-white/5 select-none",
      className
    )}
  >
    <button
      onClick={onExpand}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      title="Expand"
    >
      <ChevronDown size={12} />
    </button>
    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex-1">
      {title}
    </span>
    <button
      onClick={onHide}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      title="Hide"
    >
      <X size={12} />
    </button>
  </div>
);

/** Vertical strip shown when a panel collapses inside a horizontal group (transcript or video). */
export const CollapsedVerticalStrip = ({
  title,
  onExpand,
  onHide,
  className,
}: {
  title: string;
  onExpand: () => void;
  onHide: () => void;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col items-center h-full py-2 gap-1 bg-gray-50 dark:bg-gray-900/80 select-none",
      className
    )}
  >
    <button
      onClick={onHide}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
      title="Hide"
    >
      <X size={12} />
    </button>
    <button
      onClick={onExpand}
      className="flex-1 flex items-center justify-center w-full hover:bg-gray-100 dark:hover:bg-gray-800/60 rounded transition-colors min-h-0"
      title={`Expand ${title}`}
    >
      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 select-none">
        {title}
      </span>
    </button>
    <button
      onClick={onExpand}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
      title="Expand"
    >
      <ChevronDown size={12} className="rotate-[-90deg]" />
    </button>
  </div>
);
