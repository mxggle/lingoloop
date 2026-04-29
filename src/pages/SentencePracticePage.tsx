import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerStore } from "../stores/playerStore";
import { useSentencePracticeStore } from "../stores/sentencePracticeStore";
import { AppLayout } from "../components/layout/AppLayout";
import { SentencePracticeView } from "../components/sentence-practice/SentencePracticeView";

export const SentencePracticePage = () => {
  const navigate = useNavigate();
  const { currentFile, currentYouTube } = usePlayerStore();
  const { setIsActive } = useSentencePracticeStore();

  // Redirect to home if no media is loaded
  useEffect(() => {
    if (!currentFile && !currentYouTube) {
      navigate("/");
      return;
    }
    setIsActive(true);
  }, [currentFile, currentYouTube, navigate, setIsActive]);

  return (
    <AppLayout bottomPaddingClassName="pb-0">
      <div className="flex flex-col h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)]">
        <SentencePracticeView />
      </div>
    </AppLayout>
  );
};
