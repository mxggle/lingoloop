import { useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Youtube } from "lucide-react";

interface YouTubeInputProps {
  onVideoIdSubmit: (videoId: string) => void;
}

export const YouTubeInput = ({ onVideoIdSubmit }: YouTubeInputProps) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");

  const extractVideoId = (url: string): string | null => {
    // Handle different YouTube URL formats
    const regexPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/i,
      /youtube\.com\/embed\/([^&?/]+)/i,
      /youtube\.com\/v\/([^&?/]+)/i,
      /youtube\.com\/user\/[^/?]+\/?\?v=([^&?/]+)/i,
    ];

    for (const pattern of regexPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Check if the input is already a video ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) {
      toast.error(t("youtube.enterUrl"));
      return;
    }

    const videoId = extractVideoId(inputValue.trim());

    if (!videoId) {
      toast.error(t("youtube.invalidUrl"));
      return;
    }

    onVideoIdSubmit(videoId);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex h-12 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white pl-3 pr-1.5 transition-colors focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400/40 dark:border-white/10 dark:bg-white/[0.03]">
        <Youtube className="h-5 w-5 shrink-0 text-error-500" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t("youtube.enterUrl")}
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600 active:bg-primary-700"
        >
          {t("youtube.loadVideo")}
        </button>
      </div>
    </form>
  );
};
