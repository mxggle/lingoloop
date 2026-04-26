import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { FolderOpen } from "lucide-react";
import { nativePathToUrl } from "../../utils/platform";

const VIDEO_EXTS = new Set(["mp4", "mkv", "avi", "mov", "webm", "m4v"]);

const getMimeType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTS.has(ext) ? `video/${ext}` : `audio/${ext}`;
};

/**
 * Electron-only file opener. Shows a native "Open File" button backed by
 * window.electronAPI.openFile(), with a secondary drag-and-drop zone
 * for dragging files from Finder / Explorer.
 */
export const ElectronFileOpener = () => {
  const { t } = useTranslation();
  const { setCurrentFile } = usePlayerStore();

  const handleOpenFile = useCallback(async () => {
    const filePath = await window.electronAPI!.openFile();
    if (!filePath) return;

    const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
    setCurrentFile({
      name: fileName,
      type: getMimeType(fileName),
      size: 0,
      url: nativePathToUrl(filePath),
      nativePath: filePath,
    });
  }, [setCurrentFile]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setCurrentFile({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    },
    [setCurrentFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".aac"],
      "video/*": [".mp4", ".webm", ".ogv", ".mkv", ".avi", ".mov", ".m4v"],
    },
    maxFiles: 1,
  });

  return (
    <div className="flex flex-col gap-2 h-full justify-center items-center">
      {/* Native open-file button */}
      <button
        onClick={handleOpenFile}
        className="w-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-primary-100/50 dark:border-primary-900/20 bg-transparent rounded-xl text-center cursor-pointer transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 hover:-translate-y-0.5"
      >
        <div className="flex justify-center items-center p-3 bg-gradient-to-r from-primary-100/50 to-accent-100/50 dark:from-primary-900/10 dark:to-accent-900/10 rounded-full">
          <FolderOpen className="h-8 w-8 text-primary-500 dark:text-primary-400 drop-shadow-sm" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-800 dark:text-gray-100 mb-0.5">
            {t("upload.openFile", "Open File")}
          </p>
          <p className="text-xs text-primary-500 dark:text-primary-400 font-medium">
            {t("upload.supportedFormats")}
          </p>
        </div>
      </button>

      {/* Drag-and-drop fallback (e.g. drag from Finder) */}
      <div
        {...getRootProps()}
        className={`w-full p-2 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors text-sm ${
          isDragActive
            ? "border-primary-500/50 bg-primary-50/30 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400"
            : "border-gray-200/50 dark:border-gray-800/50 text-gray-400/80 dark:text-gray-500/80 hover:border-primary-300/50 dark:hover:border-primary-700/50"
        }`}
      >
        <input {...getInputProps()} />
        <p>{isDragActive ? t("upload.dropToUpload") : t("upload.dragDrop")}</p>
      </div>
    </div>
  );
};
