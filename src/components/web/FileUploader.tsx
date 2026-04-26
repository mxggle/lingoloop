import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { FileAudio } from "lucide-react";
import { motion } from "framer-motion";
import { storeMediaFile } from "../../utils/mediaStorage";

/** Web-only drag-and-drop file uploader. Not used in Electron. */
export const FileUploader = () => {
  const { t } = useTranslation();
  const { setCurrentFile } = usePlayerStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const validExts = new Set(["mp3", "wav", "ogg", "flac", "aac", "mp4", "webm", "ogv"]);
      const typeOk = file.type.includes("audio") || file.type.includes("video") || validExts.has(ext);
      if (!typeOk) {
        toast.error(t("upload.invalidFileType"));
        return;
      }

      try {
        const storageId = await storeMediaFile(file);
        const tempUrl = URL.createObjectURL(file);

        setCurrentFile({
          name: file.name,
          type: file.type,
          size: file.size,
          url: tempUrl,
          storageId,
        });
      } catch (error) {
        console.error("Error in file upload:", error);
        toast.error(t("upload.uploadError"));
      }
    },
    [setCurrentFile, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".aac"],
      "video/*": [".mp4", ".webm", ".ogv"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`p-6 border-2 ${
        isDragActive
          ? "border-primary-500"
          : "border-primary-100 dark:border-primary-900/30"
      } bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center cursor-pointer transition-all duration-200 h-full flex flex-col justify-center items-center ${
        isDragActive
          ? "bg-primary-50 dark:bg-primary-900/20"
          : "hover:bg-primary-50/50 dark:hover:bg-primary-900/10"
      }`}
    >
      <input {...getInputProps()} />
      <div className="relative">
        <div className="flex justify-center items-center p-4 bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/20 dark:to-accent-900/20 rounded-full mb-5 shadow-inner">
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
            <FileAudio className="h-10 w-10 text-primary-500 dark:text-primary-400 drop-shadow-md" />
          </div>
        </div>
      </div>
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-xs mx-auto"
      >
        <p className="text-base font-medium text-gray-800 dark:text-gray-100 mb-2">
          {isDragActive ? t("upload.dropToUpload") : t("upload.dragDrop")}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
          {t("upload.browseFiles")}
        </p>
        <p className="text-xs text-primary-500 dark:text-primary-400 font-medium">
          {t("upload.supportedFormats")}
        </p>
      </motion.div>
    </div>
  );
};
