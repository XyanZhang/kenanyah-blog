import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChapterDef } from "../../registry/types";
import {
  addTimelineTrack,
  fillMissingMarkers,
  findTimelineIssues,
  getActiveTrack,
  loadTimeline,
  stepForTime,
  toPortableTimeline,
  updateActiveTrack,
} from "../../timeline/config";
import {
  flattenTimelineSteps,
  markerKey,
  type TimelineConfig,
  type TimelineTrack,
  type TimelineStep,
} from "../../timeline/types";
import { useAudioWaveform } from "../../hooks/useAudioWaveform";
import { WaveformCanvas } from "./WaveformCanvas";
import "./TimelineStudio.css";

interface Props {
  chapters: ChapterDef[];
  cursor: { chapter: number; step: number };
  onJumpChapter(chapter: number, step?: number): void;
  children: React.ReactNode;
}

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}

function downloadTimeline(config: TimelineConfig) {
  const blob = new Blob([`${JSON.stringify(toPortableTimeline(config), null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "timeline.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

const isSameBeat = (a: number, b: number) => Math.abs(a - b) <= 0.03;

export function TimelineStudio({ chapters, cursor, onJumpChapter, children }: Props) {
  const steps = useMemo(() => flattenTimelineSteps(chapters), [chapters]);
  const [timeline, setTimeline] = useState<TimelineConfig | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [newMusicSrc, setNewMusicSrc] = useState("/music/");
  const [status, setStatus] = useState("读取 timeline.json…");
  const [saveError, setSaveError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const cursorRef = useRef(cursor);
  const onJumpChapterRef = useRef(onJumpChapter);

  cursorRef.current = cursor;
  onJumpChapterRef.current = onJumpChapter;

  const activeTrack = timeline ? getActiveTrack(timeline) : null;
  const waveform = useAudioWaveform(activeTrack?.musicSrc ?? "");
  const issues = useMemo(
    () => (activeTrack ? findTimelineIssues(activeTrack, chapters) : []),
    [activeTrack, chapters],
  );

  const markerMap = useMemo(
    () => new Map((activeTrack?.markers ?? []).map((marker) => [markerKey(marker), marker])),
    [activeTrack],
  );
  const selectedMarker = selectedKey ? markerMap.get(selectedKey) : null;
  const selectedStep = useMemo(
    () => steps.find((step) => markerKey(step) === selectedKey) ?? null,
    [selectedKey, steps],
  );
  const ignoredBeatTimes = activeTrack?.ignoredBeatTimes ?? [];
  const usableBeatTimes = useMemo(
    () =>
      waveform.beatTimes.filter((time) => {
        return time >= 0.2 && ignoredBeatTimes.every((ignored) => !isSameBeat(ignored, time));
      }),
    [ignoredBeatTimes, waveform.beatTimes],
  );

  useEffect(() => {
    loadTimeline(chapters).then((loaded) => {
      const filled = fillMissingMarkers(loaded, chapters);
      setTimeline(filled);
      const track = getActiveTrack(filled);
      setSelectedKey(markerKey(track.markers[0] ?? steps[0]!));
      setNewMusicSrc(track.musicSrc);
      setStatus("已载入时间轴");
    });
  }, [chapters, steps]);

  useEffect(() => {
    if (!activeTrack) return;
    const audio = new Audio(activeTrack.musicSrc);
    audio.preload = "auto";
    audioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => {
      setStatus(`BGM ${formatTime(audio.duration)} 已准备`);
    });
    audio.addEventListener("error", () => {
      setStatus("BGM 加载失败：请把音乐放到 public/music 并更新 timeline.json");
    });
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("ended", () => setPreviewing(false));
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [activeTrack?.musicSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const tick = () => {
      setCurrentTime(audio.currentTime);
      frameRef.current = requestAnimationFrame(tick);
    };
    if (playing) {
      audio.play().catch(() => {
        setPlaying(false);
        setStatus("播放失败：浏览器需要先点击一次页面");
      });
      frameRef.current = requestAnimationFrame(tick);
    } else {
      audio.pause();
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    }
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [playing]);

  useEffect(() => {
    if (!previewing || !activeTrack) return;
    const step = stepForTime(activeTrack.markers, steps, currentTime);
    const currentCursor = cursorRef.current;
    if (step && (currentCursor.chapter !== step.chapterIndex || currentCursor.step !== step.step)) {
      onJumpChapterRef.current(step.chapterIndex, step.step);
      setSelectedKey(markerKey(step));
    }
  }, [activeTrack, currentTime, previewing, steps]);

  const seek = (time: number) => {
    const audio = audioRef.current;
    const nextTime = Math.max(0, Math.min(time, waveform.duration || audio?.duration || time));
    if (audio) audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    syncPreviewAtTime(nextTime);
  };

  const syncPreviewAtTime = (time: number) => {
    if (!activeTrack) return;
    const step = stepForTime(activeTrack.markers, steps, time);
    if (!step) return;
    onJumpChapter(step.chapterIndex, step.step);
    setSelectedKey(markerKey(step));
  };

  const togglePreview = useCallback(() => {
    const next = !previewing;
    setPreviewing(next);
    setPlaying(next);
    if (next && activeTrack) {
      const step = stepForTime(activeTrack.markers, steps, currentTime);
      if (step) {
        onJumpChapter(step.chapterIndex, step.step);
        setSelectedKey(markerKey(step));
      }
    }
  }, [activeTrack, currentTime, onJumpChapter, previewing, steps]);

  const selectStep = (step: TimelineStep) => {
    const key = markerKey(step);
    setSelectedKey(key);
    onJumpChapter(step.chapterIndex, step.step);
    const marker = markerMap.get(key);
    if (marker) seek(marker.at);
  };

  const updateMarker = (key: string, at: number) => {
    setTimeline((current) => {
      if (!current) return current;
      return updateActiveTrack(current, (track) => ({
        ...track,
        markers: track.markers
          .map((marker) =>
            markerKey(marker) === key
              ? { ...marker, at: Number(Math.max(0, at).toFixed(3)) }
              : marker,
          )
          .sort((a, b) => a.at - b.at),
      }));
    });
  };

  const autoPlaceMarkers = (beatTimes = usableBeatTimes) => {
    if (!activeTrack || beatTimes.length === 0) {
      setStatus("还没有识别到可用卡点，请确认 BGM 已加载完成。");
      return;
    }
    const usableBeats = beatTimes;
    const lastBeat = usableBeats[usableBeats.length - 1] ?? waveform.duration;
    const fallbackGap = Math.max(2.5, waveform.duration / Math.max(1, steps.length));

    setTimeline((current) => {
      if (!current) return current;
      return updateActiveTrack(current, (track) => ({
        ...track,
        markers: steps.map((step, index) => {
          const at = usableBeats[index] ?? lastBeat + (index - usableBeats.length + 1) * fallbackGap;
          return {
            chapterId: step.chapterId,
            step: step.step,
            at: Number(Math.min(at, waveform.duration || at).toFixed(3)),
          };
        }),
      }));
    });
    seek(usableBeats[0] ?? 0);
    setStatus(`已根据 ${usableBeats.length} 个可用候选卡点自动定位节奏点`);
  };

  const toggleIgnoredBeat = (beatTime: number) => {
    const nextIgnored = ignoredBeatTimes.some((time) => isSameBeat(time, beatTime))
      ? ignoredBeatTimes.filter((time) => !isSameBeat(time, beatTime))
      : [...ignoredBeatTimes, Number(beatTime.toFixed(3))].sort((a, b) => a - b);
    const nextUsable = waveform.beatTimes.filter((time) => {
      return time >= 0.2 && nextIgnored.every((ignored) => !isSameBeat(ignored, time));
    });

    setTimeline((current) => {
      if (!current) return current;
      return updateActiveTrack(current, (track) => ({
        ...track,
        ignoredBeatTimes: nextIgnored,
      }));
    });
    autoPlaceMarkers(nextUsable);
    setStatus(
      nextIgnored.some((time) => isSameBeat(time, beatTime))
        ? `已忽略 ${formatTime(beatTime)}，后续页面已顺延`
        : `已恢复 ${formatTime(beatTime)}，节奏点已重新分配`,
    );
  };

  const switchTrack = (trackId: string) => {
    setPlaying(false);
    setPreviewing(false);
    setCurrentTime(0);
    setTimeline((current) => (current ? { ...current, activeTrackId: trackId } : current));
    const track = timeline?.tracks.find((item) => item.id === trackId);
    if (track) {
      setSelectedKey(markerKey(track.markers[0] ?? steps[0]!));
      setNewMusicSrc(track.musicSrc);
      onJumpChapter(0, 0);
    }
  };

  const addTrack = () => {
    const musicSrc = newMusicSrc.trim();
    if (!musicSrc || !timeline) return;
    setPlaying(false);
    setPreviewing(false);
    setCurrentTime(0);
    const next = addTimelineTrack(timeline, chapters, musicSrc);
    const track = getActiveTrack(next);
    setTimeline(next);
    setSelectedKey(markerKey(track.markers[0] ?? steps[0]!));
    onJumpChapter(0, 0);
    setStatus(`已新增 BGM：${track.name}`);
  };

  const renameActiveTrack = (name: string) => {
    setTimeline((current) =>
      current
        ? updateActiveTrack(current, (track): TimelineTrack => ({ ...track, name }))
        : current,
    );
  };

  const save = async () => {
    if (!timeline) return;
    const body = JSON.stringify(toPortableTimeline(timeline), null, 2);
    try {
      const response = await fetch("/__timeline/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) throw new Error("save failed");
      setSaveError(false);
      setStatus("已保存到 public/timeline.json");
    } catch {
      setSaveError(true);
      setStatus("开发保存接口不可用，可先下载 JSON");
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === " ") {
        event.preventDefault();
        togglePreview();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const delta = event.shiftKey ? 1 : 0.1;
        const direction = event.key === "ArrowRight" ? 1 : -1;
        if (selectedKey && event.altKey) {
          const marker = markerMap.get(selectedKey);
          if (marker) updateMarker(selectedKey, marker.at + direction * delta);
        } else {
          seek(currentTime + direction * delta);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTime, markerMap, selectedKey, togglePreview, waveform.duration]);

  if (!timeline || !activeTrack) {
    return <div className="timeline-loading">正在准备时间轴工作台…</div>;
  }

  return (
    <div className="timeline-studio">
      <div className="timeline-preview">
        {previewing ? <div className="timeline-preview-badge">Preview sync</div> : null}
        {children}
      </div>
      <aside className="timeline-side" data-no-advance>
        <div>
          <p className="timeline-kicker">Wedding timeline studio</p>
          <h1>音乐卡点工作台</h1>
        </div>
        <div className="timeline-track-panel">
          <label>
            <span>当前 BGM</span>
            <select
              value={timeline.activeTrackId}
              onChange={(event) => switchTrack(event.target.value)}
            >
              {timeline.tracks.map((track) => (
                <option value={track.id} key={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>名称</span>
            <input
              value={activeTrack.name}
              onChange={(event) => renameActiveTrack(event.target.value)}
            />
          </label>
          <label>
            <span>新增音乐路径</span>
            <input
              value={newMusicSrc}
              onChange={(event) => setNewMusicSrc(event.target.value)}
              placeholder="/music/song.mp3"
            />
          </label>
          <button onClick={addTrack}>新增 BGM 节奏</button>
        </div>
        <div className="timeline-readout">
          <span>{formatTime(currentTime)}</span>
          <small>{selectedStep?.label ?? "未选择 step"}</small>
        </div>
        <div className="timeline-actions">
          <button className="is-primary" onClick={togglePreview}>
            {previewing ? "暂停预览" : "播放预览"}
          </button>
          <button onClick={() => autoPlaceMarkers()}>自动卡点</button>
          <button onClick={save}>保存</button>
          <button onClick={() => downloadTimeline(timeline)}>下载 JSON</button>
        </div>
        <p className={`timeline-status ${saveError ? "is-warn" : ""}`}>{status}</p>
        {waveform.error ? <p className="timeline-status is-warn">{waveform.error}</p> : null}
        {issues.length > 0 ? (
          <div className="timeline-issues">
            <strong>{issues.length} 个 step 缺少时间点</strong>
            <span>已在工作台中补齐草稿，保存后会写回 JSON。</span>
          </div>
        ) : null}
        <div className="timeline-step-list">
          {steps.map((step) => {
            const key = markerKey(step);
            const marker = markerMap.get(key);
            const active = cursor.chapter === step.chapterIndex && cursor.step === step.step;
            return (
              <button
                key={key}
                className={`${active ? "is-active" : ""} ${selectedKey === key ? "is-selected" : ""} ${!marker ? "is-missing" : ""}`}
                onClick={() => selectStep(step)}
              >
                <span>{String(step.globalIndex + 1).padStart(2, "0")}</span>
                <strong>{step.label}</strong>
                <em>{marker ? formatTime(marker.at) : "missing"}</em>
              </button>
            );
          })}
        </div>
      </aside>
      <section className="timeline-deck" data-no-advance>
        <div className="timeline-deck-head">
          <div>
            <strong>{waveform.loading ? "正在解码波形…" : "BGM Waveform"}</strong>
            <span>
              {activeTrack.musicSrc}
              {waveform.beatTimes.length > 0
                ? ` / 候选 ${waveform.beatTimes.length} / 已忽略 ${ignoredBeatTimes.length}`
                : ""}
            </span>
          </div>
          {selectedMarker ? (
            <label>
              <span>选中时间</span>
              <input
                type="number"
                step="0.001"
                value={selectedMarker.at}
                onChange={(event) => updateMarker(markerKey(selectedMarker), Number(event.target.value))}
              />
            </label>
          ) : null}
        </div>
        <WaveformCanvas
          peaks={waveform.peaks}
          duration={waveform.duration || audioRef.current?.duration || 120}
          currentTime={currentTime}
          markers={activeTrack.markers}
          beatTimes={waveform.beatTimes}
          ignoredBeatTimes={ignoredBeatTimes}
          selectedKey={selectedKey}
          onSeek={seek}
          onSelect={(key) => {
            setSelectedKey(key);
            const marker = markerMap.get(key);
            const step = steps.find((item) => markerKey(item) === key);
            if (marker) seek(marker.at);
            if (step) onJumpChapter(step.chapterIndex, step.step);
          }}
          onDragMarker={(key, time) => {
            updateMarker(key, time);
            const step = steps.find((item) => markerKey(item) === key);
            if (step) onJumpChapter(step.chapterIndex, step.step);
          }}
          onToggleBeat={toggleIgnoredBeat}
        />
      </section>
    </div>
  );
}
