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
    <div className="flex flex-col gap-3 h-full justify-center items-center">
      {/* Native open-file button */}
      <button
        onClick={handleOpenFile}
        className="w-full flex flex-col items-center justify-center gap-3 p-6 border-2 border-primary-100 dark:border-primary-900/30 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center cursor-pointer transition-all duration-200 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 hover:shadow-md hover:-translate-y-0.5"
      >
        <div className="flex justify-center items-center p-4 bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/20 dark:to-accent-900/20 rounded-full shadow-inner">
          <FolderOpen className="h-10 w-10 text-primary-500 dark:text-primary-400 drop-shadow-md" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-800 dark:text-gray-100 mb-1">
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
        className={`w-full p-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors text-sm ${
          isDragActive
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
            : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-primary-300 dark:hover:border-primary-700"
        }`}
      >
        <input {...getInputProps()} />
        <p>{isDragActive ? t("upload.dropToUpload") : t("upload.dragDrop")}</p>
      </div>
    </div>
  );
};
