import type { ChapterDef } from "../registry/types";

export interface TimelineMarker {
  chapterId: string;
  step: number;
  at: number;
}

export interface TimelineConfig {
  activeTrackId: string;
  tracks: TimelineTrack[];
}

export interface TimelineTrack {
  id: string;
  name: string;
  musicSrc: string;
  markers: TimelineMarker[];
  ignoredBeatTimes?: number[];
}

export interface TimelineStep {
  chapterIndex: number;
  chapterId: string;
  chapterTitle: string;
  step: number;
  globalIndex: number;
  label: string;
}

export interface TimelineIssue {
  key: string;
  label: string;
  message: string;
}

export function markerKey(marker: Pick<TimelineMarker, "chapterId" | "step">) {
  return `${marker.chapterId}:${marker.step}`;
}

export function flattenTimelineSteps(chapters: ChapterDef[]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  chapters.forEach((chapter, chapterIndex) => {
    chapter.narrations.forEach((_, step) => {
      steps.push({
        chapterIndex,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        step,
        globalIndex: steps.length,
        label: `${chapter.title} / ${String(step + 1).padStart(2, "0")}`,
      });
    });
  });
  return steps;
}
