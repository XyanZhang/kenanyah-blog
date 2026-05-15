import type { ChapterDef } from "../registry/types";
import {
  flattenTimelineSteps,
  markerKey,
  type TimelineConfig,
  type TimelineIssue,
  type TimelineMarker,
  type TimelineStep,
  type TimelineTrack,
} from "./types";

export const TIMELINE_PATH = `${import.meta.env.BASE_URL}timeline.json`;
export const DEFAULT_MUSIC_SRC = `${import.meta.env.BASE_URL}music/IDo-911.mp3`;
const DEFAULT_STEP_GAP = 4;

const roundTime = (value: number) => Math.max(0, Number(value.toFixed(3)));

function trackIdFromMusicSrc(musicSrc: string) {
  return musicSrc
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "default-bgm";
}

export function trackNameFromMusicSrc(musicSrc: string) {
  return decodeURIComponent(
    musicSrc
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ") || "Untitled BGM",
  );
}

export function makeDraftTrack(chapters: ChapterDef[], musicSrc = DEFAULT_MUSIC_SRC): TimelineTrack {
  const steps = flattenTimelineSteps(chapters);
  const id = trackIdFromMusicSrc(musicSrc);
  return {
    id,
    name: trackNameFromMusicSrc(musicSrc),
    musicSrc,
    markers: steps.map((step) => ({
      chapterId: step.chapterId,
      step: step.step,
      at: roundTime(step.globalIndex * DEFAULT_STEP_GAP),
    })),
  };
}

export function makeDraftTimeline(chapters: ChapterDef[]): TimelineConfig {
  const track = makeDraftTrack(chapters);
  return {
    activeTrackId: track.id,
    tracks: [track],
  };
}

function normalizeTrack(
  track: Partial<TimelineTrack> & { musicSrc?: string; markers?: TimelineMarker[] },
  chapters: ChapterDef[],
): TimelineTrack {
  const steps = flattenTimelineSteps(chapters);
  const validKeys = new Set(steps.map(markerKey));
  const seen = new Set<string>();
  const markers: TimelineMarker[] = [];

  for (const marker of track.markers ?? []) {
    const key = markerKey(marker);
    if (!validKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    markers.push({
      chapterId: marker.chapterId,
      step: marker.step,
      at: roundTime(Number.isFinite(marker.at) ? marker.at : 0),
    });
  }

  const musicSrc = track.musicSrc || DEFAULT_MUSIC_SRC;
  const id = track.id || trackIdFromMusicSrc(musicSrc);
  return {
    id,
    name: track.name || trackNameFromMusicSrc(musicSrc),
    musicSrc,
    markers: markers.sort((a, b) => a.at - b.at),
    ignoredBeatTimes: [...new Set(track.ignoredBeatTimes ?? [])]
      .filter((time) => Number.isFinite(time) && time >= 0)
      .map(roundTime)
      .sort((a, b) => a - b),
  };
}

function isLegacyTimeline(config: unknown): config is { musicSrc: string; markers: TimelineMarker[] } {
  return (
    typeof config === "object" &&
    config !== null &&
    "musicSrc" in config &&
    "markers" in config &&
    Array.isArray((config as { markers?: unknown }).markers)
  );
}

export function normalizeTimeline(config: TimelineConfig | unknown, chapters: ChapterDef[]): TimelineConfig {
  if (isLegacyTimeline(config)) {
    const track = normalizeTrack(config, chapters);
    return { activeTrackId: track.id, tracks: [track] };
  }

  const raw = config as Partial<TimelineConfig>;
  const tracks =
    Array.isArray(raw.tracks) && raw.tracks.length > 0
      ? raw.tracks.map((track) => normalizeTrack(track, chapters))
      : [makeDraftTrack(chapters)];
  const activeTrackId =
    raw.activeTrackId && tracks.some((track) => track.id === raw.activeTrackId)
      ? raw.activeTrackId
      : tracks[0]!.id;

  return { activeTrackId, tracks };
}

export function fillMissingMarkersInTrack(
  track: TimelineTrack,
  chapters: ChapterDef[],
): TimelineTrack {
  const normalized = normalizeTrack(track, chapters);
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

export function fillMissingMarkers(
  config: TimelineConfig,
  chapters: ChapterDef[],
): TimelineConfig {
  return {
    ...config,
    tracks: config.tracks.map((track) =>
      track.id === config.activeTrackId ? fillMissingMarkersInTrack(track, chapters) : track,
    ),
  };
}

export function findTimelineIssues(
  track: TimelineTrack,
  chapters: ChapterDef[],
): TimelineIssue[] {
  const steps = flattenTimelineSteps(chapters);
  const markers = new Map(track.markers.map((marker) => [markerKey(marker), marker]));
  return steps
    .filter((step) => !markers.has(markerKey(step)))
    .map((step) => ({
      key: markerKey(step),
      label: step.label,
      message: "缺少时间点",
    }));
}

export function getActiveTrack(config: TimelineConfig): TimelineTrack {
  return config.tracks.find((track) => track.id === config.activeTrackId) ?? config.tracks[0]!;
}

export function addTimelineTrack(
  config: TimelineConfig,
  chapters: ChapterDef[],
  musicSrc: string,
): TimelineConfig {
  const baseId = trackIdFromMusicSrc(musicSrc);
  const usedIds = new Set(config.tracks.map((track) => track.id));
  let id = baseId;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${n}`;
    n += 1;
  }
  const track = { ...makeDraftTrack(chapters, musicSrc), id };
  return {
    activeTrackId: track.id,
    tracks: [...config.tracks, track],
  };
}

export function updateActiveTrack(
  config: TimelineConfig,
  updater: (track: TimelineTrack) => TimelineTrack,
): TimelineConfig {
  return {
    ...config,
    tracks: config.tracks.map((track) =>
      track.id === config.activeTrackId ? updater(track) : track,
    ),
  };
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
    const json = await response.json();
    return normalizeTimeline(json, chapters);
  } catch {
    return makeDraftTimeline(chapters);
  }
}

export function toPortableTimeline(config: TimelineConfig): TimelineConfig {
  return {
    activeTrackId: config.activeTrackId,
    tracks: config.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      musicSrc: track.musicSrc,
      ignoredBeatTimes: [...new Set(track.ignoredBeatTimes ?? [])]
        .map(roundTime)
        .sort((a, b) => a - b),
      markers: [...track.markers]
        .sort((a, b) => a.at - b.at)
        .map((marker) => ({
          chapterId: marker.chapterId,
          step: marker.step,
          at: roundTime(marker.at),
        })),
    })),
  };
}
