import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { nativePathToUrl } from "../../utils/platform";
import type { FolderTreeNode } from "../../types/electron";
import {
  getShowInFileManagerLabel,
  revealInFileManager,
} from "./fileManager";
import {
  Folder,
  FolderOpen,
  Music,
  FileVideo,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  SquareArrowOutUpRight,
} from "lucide-react";
import { SidebarRow } from "../ui/SidebarRow";
import { SidebarRowAction } from "../ui/SidebarRowAction";

const VIDEO_EXTS = new Set(["mp4", "mkv", "avi", "mov", "webm", "m4v"]);

const getMimeType = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTS.has(ext) ? `video/${ext}` : `audio/${ext}`;
};

/* ── File node ──────────────────────────────────────────────────── */
interface TreeNodeProps {
  node: FolderTreeNode;
  depth: number;
  onFileClick: (node: FolderTreeNode) => void;
  activeFilePath?: string | null;
}

const TreeNode = ({ node, depth, onFileClick, activeFilePath }: TreeNodeProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(depth === 0);
  const showInFileManagerLabel = getShowInFileManagerLabel(t);

  if (node.type === "file") {
    const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
    const isVideo = VIDEO_EXTS.has(ext);
    const isActive = activeFilePath === node.path;
    
    return (
      <li>
        <SidebarRow
          onClick={() => onFileClick(node)}
          isActive={isActive}
          depth={depth}
          containerClassName="pl-5"
          icon={
            isVideo ? (
              <FileVideo className="w-3.5 h-3.5 text-accent-400 dark:text-accent-500" />
            ) : (
              <Music className="w-3.5 h-3.5 text-primary-400 dark:text-primary-500" />
            )
          }
          primaryText={node.name}
          actions={
            <SidebarRowAction
              icon={<SquareArrowOutUpRight />}
              onClick={() => void revealInFileManager(node.path)}
              title={showInFileManagerLabel}
            />
          }
        />
      </li>
    );
  }

  // Directory node
  return (
    <li>
      <SidebarRow
        onClick={() => setOpen((o) => !o)}
        depth={depth}
        icon={
          <div className="flex items-center gap-0.5">
            {open ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
            {open ? (
              <FolderOpen className="w-3.5 h-3.5 text-accent-400 dark:text-accent-500" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-accent-400 dark:text-accent-500" />
            )}
          </div>
        }
        primaryText={node.name}
        actions={
          <SidebarRowAction
            icon={<SquareArrowOutUpRight />}
            onClick={() => void revealInFileManager(node.path)}
            title={showInFileManagerLabel}
          />
        }
      />
      {open && node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/* ── Root folder ────────────────────────────────────────────────── */
interface RootFolderProps {
  path: string;
  onFileClick: (node: FolderTreeNode) => void;
  onRemove: (path: string) => void;
  activeFilePath?: string | null;
}

const RootFolder = ({ path, onFileClick, onRemove, activeFilePath }: RootFolderProps) => {
  const { t } = useTranslation();
  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const folderName = path.split(/[\\/]/).pop() ?? path;
  const showInFileManagerLabel = getShowInFileManagerLabel(t);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const nodes = await window.electronAPI!.listMediaTree(path);
      setTree(nodes);
    } catch (err) {
      console.error("Failed to list media tree:", err);
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div className="mb-1">
      {/* Root folder row */}
      <SidebarRow
        onClick={() => setOpen((o) => !o)}
        icon={
          <div className="flex items-center gap-0.5">
            {open ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )}
            {open ? (
              <FolderOpen className="w-4 h-4 text-accent-500 dark:text-accent-400" />
            ) : (
              <Folder className="w-4 h-4 text-accent-500 dark:text-accent-400" />
            )}
          </div>
        }
        primaryText={folderName}
        className="h-[30px]"
        contentClassName="font-semibold text-gray-800 dark:text-gray-100"
        actions={
          <>
            {loading && <Loader2 className="w-3 h-3 text-gray-400 animate-spin mr-1" />}
            <SidebarRowAction
              icon={<SquareArrowOutUpRight />}
              onClick={() => void revealInFileManager(path)}
              title={showInFileManagerLabel}
            />
            <SidebarRowAction
              variant="error"
              icon={<X />}
              onClick={() => onRemove(path)}
              title={t("folderBrowser.removeFolder", "Remove folder")}
            />
          </>
        }
      />

      {/* Tree */}
      {open && loading && (
        <div className="flex items-center gap-2 pl-8 h-[26px]">
          <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
          <span className="text-xs text-gray-400">{t("folderBrowser.loading", "Loading…")}</span>
        </div>
      )}
      {open && !loading && tree.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 pl-8 h-[26px] leading-[26px]">
          {t("folderBrowser.noFiles", "No media files found.")}
        </p>
      )}
      {open && tree.length > 0 && (
        <ul>
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={1}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

/* ── Exported component ─────────────────────────────────────────── */
interface FolderBrowserProps {
  /** Called by parent section header to add a folder */
  onAddFolder?: () => void;
}

export const FolderBrowser = ({ onAddFolder: _onAddFolder }: FolderBrowserProps) => {
  const { t } = useTranslation();
  const { setCurrentFile, sourceFolders, addSourceFolder, removeSourceFolder, currentFile } =
    usePlayerStore();

  const handleAddFolder = useCallback(async () => {
    const selected = await window.electronAPI!.openFolder();
    if (!selected) return;
    addSourceFolder(selected);
  }, [addSourceFolder]);

  // Use prop if given, else local handler
  const addFolder = _onAddFolder ?? handleAddFolder;

  const handleFileClick = useCallback(
    (node: FolderTreeNode) => {
      setCurrentFile({
        name: node.name,
        type: getMimeType(node.name),
        size: 0,
        url: nativePathToUrl(node.path),
        nativePath: node.path,
      });
    },
    [setCurrentFile]
  );

  const activeFilePath = currentFile?.nativePath ?? null;

  if (sourceFolders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        <Folder className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {t("sidebar.noFolders", "No folders added yet.")}
        </p>
        <button
          onClick={addFolder}
          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 rounded px-1"
        >
          {t("sidebar.addFolder", "Add folder")}
        </button>
      </div>
    );
  }

  return (
    <div className="py-1">
      {sourceFolders.map((folderPath) => (
        <RootFolder
          key={folderPath}
          path={folderPath}
          onFileClick={handleFileClick}
          onRemove={removeSourceFolder}
          activeFilePath={activeFilePath}
        />
      ))}
    </div>
  );
};

