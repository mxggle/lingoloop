import { useTranslation } from "react-i18next";
import { YouTubeInput } from "../components/player/YouTubeInput";
import { ElectronFileOpener } from "../components/electron/ElectronFileOpener";
import { motion } from "framer-motion";
import { Youtube, FileAudio, Mic } from "lucide-react";

interface ElectronHomePageProps {
  handleVideoIdSubmit: (videoId: string) => void;
}

export const ElectronHomePage = ({ handleVideoIdSubmit }: ElectronHomePageProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 min-h-full bg-gray-50/30 dark:bg-gray-950/20 flex flex-col justify-center">
      {/* Main Canvas - Studio Hero */}
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-8 py-6 lg:px-12"
      >
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Minimalist Hero */}
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-black tracking-tight text-gray-900 dark:text-white"
            >
              {t("home.startPracticing", "Start Practicing")}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-base text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed"
            >
              {t("home.studioDesc", "Open a local media file or stream from YouTube to begin your language mastery session.")}
            </motion.p>
          </div>

          {/* Unified Launcher Canvas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Local Entry */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 to-primary-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
              <div className="relative bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl h-full flex flex-col transition-all group-hover:border-primary-500/30 group-hover:shadow-2xl group-hover:shadow-primary-500/5">
                <div className="mb-6 flex items-center justify-between">
                  <div className="w-12 h-12 bg-accent-50 dark:bg-accent-900/30 rounded-2xl flex items-center justify-center text-accent-600 dark:text-accent-400 group-hover:scale-110 transition-transform">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-accent-500 transition-colors">{t("home.localFile")}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
                  {t("home.localMedia")}
                </h3>
                <div className="flex-1 flex flex-col justify-center py-2">
                  <div className="uploader-studio-override">
                    <ElectronFileOpener />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* YouTube Entry */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-error-500/10 to-orange-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
              <div className="relative bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl h-full flex flex-col transition-all group-hover:border-error-500/30 group-hover:shadow-2xl group-hover:shadow-error-500/5">
                <div className="mb-6 flex items-center justify-between">
                  <div className="w-12 h-12 bg-red-50 dark:bg-error-900/30 rounded-2xl flex items-center justify-center text-error-600 dark:text-error-400 group-hover:scale-110 transition-transform">
                    <Youtube className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-error-500 transition-colors">{t("home.cloudStream")}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
                  {t("home.youtubeVideo")}
                </h3>
                <div className="flex-1 flex flex-col justify-center py-2">
                  <div className="youtube-studio-override">
                    <YouTubeInput onVideoIdSubmit={handleVideoIdSubmit} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Podcast Entry - Coming Soon */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="group relative opacity-70 grayscale-[0.3]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
              <div className="relative bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl h-full flex flex-col transition-all group-hover:border-indigo-500/30 group-hover:shadow-2xl group-hover:shadow-indigo-500/5">
                <div className="mb-6 flex items-center justify-between">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <Mic className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-indigo-500 transition-colors">
                    {t("common.comingSoon", "Coming Soon")}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
                  {t("home.podcasts", "Podcasts & RSS")}
                </h3>
                <div className="flex-1 flex flex-col justify-center py-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Direct integration for podcast feeds and RSS audio subscriptions is currently under development.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.main>
      
      {/* Visual Overrides */}
      <style>{`
        .uploader-studio-override .border-dashed {
          border-radius: 1.5rem !important;
          background: rgba(0,0,0,0.02) !important;
        }
        .dark .uploader-studio-override .border-dashed {
          background: rgba(255,255,255,0.02) !important;
        }
      `}</style>
    </div>
  );
};
