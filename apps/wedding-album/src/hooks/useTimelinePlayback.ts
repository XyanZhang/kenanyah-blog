import { useEffect, useMemo, useRef, useState } from "react";
import type { ChapterDef } from "../registry/types";
import { flattenTimelineSteps } from "../timeline/types";
import { loadTimeline, stepForTime } from "../timeline/config";

interface Options {
  chapters: ChapterDef[];
  enabled: boolean;
  autoStarted: boolean;
  onJump(chapter: number, step: number): void;
}

export function useTimelinePlayback({
  chapters,
  enabled,
  autoStarted,
  onJump,
}: Options) {
  const steps = useMemo(() => flattenTimelineSteps(chapters), [chapters]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastKeyRef = useRef("");
  const onJumpRef = useRef(onJump);
  const [error, setError] = useState<string | null>(null);
  onJumpRef.current = onJump;

  useEffect(() => {
    if (!enabled || !autoStarted) return;

    let cancelled = false;
    setError(null);

    const stop = () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audioRef.current = null;
      }
      lastKeyRef.current = "";
    };

    loadTimeline(chapters)
      .then((timeline) => {
        if (cancelled) return;
        const audio = new Audio(timeline.musicSrc);
        audio.preload = "auto";
        audioRef.current = audio;

        const tick = () => {
          const step = stepForTime(timeline.markers, steps, audio.currentTime);
          if (step) {
            const key = `${step.chapterIndex}:${step.step}`;
            if (key !== lastKeyRef.current) {
              lastKeyRef.current = key;
              onJumpRef.current(step.chapterIndex, step.step);
            }
          }
          if (!audio.paused && !audio.ended) {
            frameRef.current = requestAnimationFrame(tick);
          }
        };

        audio.addEventListener("error", () => {
          setError("BGM 加载失败，已保留手动浏览。");
        });
        audio.addEventListener("play", () => {
          frameRef.current = requestAnimationFrame(tick);
        });
        audio.addEventListener("ended", () => {
          if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        });

        audio.play().catch(() => {
          setError("浏览器阻止了 BGM 自动播放，请点击开始后再试。");
        });
      })
      .catch(() => setError("timeline.json 读取失败，已保留手动浏览。"));

    return () => {
      cancelled = true;
      stop();
    };
  }, [chapters, enabled, autoStarted, steps]);

  return { error };
}
