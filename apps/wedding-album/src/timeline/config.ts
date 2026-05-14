import type { ChapterDef } from "../registry/types";
import {
  flattenTimelineSteps,
  markerKey,
  type TimelineConfig,
  type TimelineIssue,
  type TimelineMarker,
  type TimelineStep,
} from "./types";

export const TIMELINE_PATH = `${import.meta.env.BASE_URL}timeline.json`;
export const DEFAULT_MUSIC_SRC = `${import.meta.env.BASE_URL}music/wedding-bgm.mp3`;
const DEFAULT_STEP_GAP = 4;

const roundTime = (value: number) => Math.max(0, Number(value.toFixed(3)));

export function makeDraftTimeline(chapters: ChapterDef[]): TimelineConfig {
  const steps = flattenTimelineSteps(chapters);
  return {
    musicSrc: DEFAULT_MUSIC_SRC,
    markers: steps.map((step) => ({
      chapterId: step.chapterId,
      step: step.step,
      at: roundTime(step.globalIndex * DEFAULT_STEP_GAP),
    })),
  };
}

export function normalizeTimeline(
  config: TimelineConfig,
  chapters: ChapterDef[],
): TimelineConfig {
  const steps = flattenTimelineSteps(chapters);
  const validKeys = new Set(steps.map(markerKey));
  const seen = new Set<string>();
  const markers: TimelineMarker[] = [];

  for (const marker of config.markers) {
    const key = markerKey(marker);
    if (!validKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    markers.push({
      chapterId: marker.chapterId,
      step: marker.step,
      at: roundTime(Number.isFinite(marker.at) ? marker.at : 0),
    });
  }

  return {
    musicSrc: config.musicSrc || DEFAULT_MUSIC_SRC,
    markers: markers.sort((a, b) => a.at - b.at),
  };
}

export function fillMissingMarkers(
  config: TimelineConfig,
  chapters: ChapterDef[],
): TimelineConfig {
  const normalized = normalizeTimeline(config, chapters);
  const steps = flattenTimelineSteps(chapters);
  const markerMap = new Map(normalized.markers.map((marker) => [markerKey(marker), marker]));
  let lastTime =
    normalized.markers.length > 0
      ? Math.max(...normalized.markers.map((marker) => marker.at))
      : 0;

  const markers = steps.map((step) => {
    const existing = markerMap.get(markerKey(step));
    if (existing) {
      lastTime = Math.max(lastTime, existing.at);
      return existing;
    }
    lastTime = roundTime(lastTime + DEFAULT_STEP_GAP);
    return { chapterId: step.chapterId, step: step.step, at: lastTime };
  });

  return { ...normalized, markers };
}

export function findTimelineIssues(
  config: TimelineConfig,
  chapters: ChapterDef[],
): TimelineIssue[] {
  const steps = flattenTimelineSteps(chapters);
  const markers = new Map(config.markers.map((marker) => [markerKey(marker), marker]));
  return steps
    .filter((step) => !markers.has(markerKey(step)))
    .map((step) => ({
      key: markerKey(step),
      label: step.label,
      message: "缺少时间点",
    }));
}

export function stepForTime(
  markers: TimelineMarker[],
  steps: TimelineStep[],
  time: number,
): TimelineStep | null {
  const markerByKey = new Map(markers.map((marker) => [markerKey(marker), marker]));
  const ordered = steps
    .map((step) => ({ step, marker: markerByKey.get(markerKey(step)) }))
    .filter((item): item is { step: TimelineStep; marker: TimelineMarker } => Boolean(item.marker))
    .sort((a, b) => a.marker.at - b.marker.at);

  let current: TimelineStep | null = null;
  for (const item of ordered) {
    if (item.marker.at <= time + 0.02) current = item.step;
    else break;
  }
  return current;
}

export async function loadTimeline(chapters: ChapterDef[]): Promise<TimelineConfig> {
  try {
    const response = await fetch(TIMELINE_PATH, { cache: "no-store" });
    if (!response.ok) return makeDraftTimeline(chapters);
    const json = (await response.json()) as TimelineConfig;
    return normalizeTimeline(json, chapters);
  } catch {
    return makeDraftTimeline(chapters);
  }
}

export function toPortableTimeline(config: TimelineConfig): TimelineConfig {
  return {
    musicSrc: config.musicSrc,
    markers: [...config.markers]
      .sort((a, b) => a.at - b.at)
      .map((marker) => ({
        chapterId: marker.chapterId,
        step: marker.step,
        at: roundTime(marker.at),
      })),
  };
}
