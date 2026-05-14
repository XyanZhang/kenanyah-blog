import { useEffect, useMemo, useRef, useState } from "react";
import type { ChapterDef } from "../../registry/types";
import {
  fillMissingMarkers,
  findTimelineIssues,
  loadTimeline,
  toPortableTimeline,
} from "../../timeline/config";
import {
  flattenTimelineSteps,
  markerKey,
  type TimelineConfig,
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

export function TimelineStudio({ chapters, cursor, onJumpChapter, children }: Props) {
  const steps = useMemo(() => flattenTimelineSteps(chapters), [chapters]);
  const [timeline, setTimeline] = useState<TimelineConfig | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("读取 timeline.json…");
  const [saveError, setSaveError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const waveform = useAudioWaveform(timeline?.musicSrc ?? "");
  const issues = useMemo(
    () => (timeline ? findTimelineIssues(timeline, chapters) : []),
    [chapters, timeline],
  );

  const markerMap = useMemo(
    () => new Map((timeline?.markers ?? []).map((marker) => [markerKey(marker), marker])),
    [timeline],
  );
  const selectedMarker = selectedKey ? markerMap.get(selectedKey) : null;
  const selectedStep = useMemo(
    () => steps.find((step) => markerKey(step) === selectedKey) ?? null,
    [selectedKey, steps],
  );

  useEffect(() => {
    loadTimeline(chapters).then((loaded) => {
      const filled = fillMissingMarkers(loaded, chapters);
      setTimeline(filled);
      setSelectedKey(markerKey(filled.markers[0] ?? steps[0]!));
      setStatus("已载入时间轴");
    });
  }, [chapters, steps]);

  useEffect(() => {
    if (!timeline) return;
    const audio = new Audio(timeline.musicSrc);
    audio.preload = "auto";
    audioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => {
      setStatus(`BGM ${formatTime(audio.duration)} 已准备`);
    });
    audio.addEventListener("error", () => {
      setStatus("BGM 加载失败：请把音乐放到 public/music 并更新 timeline.json");
    });
    audio.addEventListener("ended", () => setPlaying(false));
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [timeline?.musicSrc]);

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

  const seek = (time: number) => {
    const audio = audioRef.current;
    const nextTime = Math.max(0, Math.min(time, waveform.duration || audio?.duration || time));
    if (audio) audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

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
      return {
        ...current,
        markers: current.markers
          .map((marker) =>
            markerKey(marker) === key
              ? { ...marker, at: Number(Math.max(0, at).toFixed(3)) }
              : marker,
          )
          .sort((a, b) => a.at - b.at),
      };
    });
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
        setPlaying((value) => !value);
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
  }, [currentTime, markerMap, selectedKey, waveform.duration]);

  if (!timeline) {
    return <div className="timeline-loading">正在准备时间轴工作台…</div>;
  }

  return (
    <div className="timeline-studio">
      <div className="timeline-preview">{children}</div>
      <aside className="timeline-side" data-no-advance>
        <div>
          <p className="timeline-kicker">Wedding timeline studio</p>
          <h1>音乐卡点工作台</h1>
        </div>
        <div className="timeline-readout">
          <span>{formatTime(currentTime)}</span>
          <small>{selectedStep?.label ?? "未选择 step"}</small>
        </div>
        <div className="timeline-actions">
          <button onClick={() => setPlaying((value) => !value)}>
            {playing ? "暂停" : "播放"}
          </button>
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
            <span>{timeline.musicSrc}</span>
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
          markers={timeline.markers}
          selectedKey={selectedKey}
          onSeek={seek}
          onSelect={setSelectedKey}
          onDragMarker={(key, time) => {
            updateMarker(key, time);
            const step = steps.find((item) => markerKey(item) === key);
            if (step) onJumpChapter(step.chapterIndex, step.step);
          }}
        />
      </section>
    </div>
  );
}
