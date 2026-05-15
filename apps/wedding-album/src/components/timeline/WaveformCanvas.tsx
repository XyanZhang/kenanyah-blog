import { useEffect, useRef } from "react";
import type { TimelineMarker } from "../../timeline/types";

interface Props {
  peaks: number[];
  duration: number;
  currentTime: number;
  markers: TimelineMarker[];
  beatTimes: number[];
  ignoredBeatTimes: number[];
  selectedKey: string | null;
  onSeek(time: number): void;
  onSelect(key: string): void;
  onDragMarker(key: string, time: number): void;
  onToggleBeat(time: number): void;
}

function keyFor(marker: TimelineMarker) {
  return `${marker.chapterId}:${marker.step}`;
}

function timeFromEvent(canvas: HTMLCanvasElement, clientX: number, duration: number) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return ratio * duration;
}

export function WaveformCanvas({
  peaks,
  duration,
  currentTime,
  markers,
  beatTimes,
  ignoredBeatTimes,
  selectedKey,
  onSeek,
  onSelect,
  onDragMarker,
  onToggleBeat,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = "#18140f";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const mid = rect.height * 0.42;
    const bandHeight = rect.height * 0.34;
    const barWidth = rect.width / Math.max(1, peaks.length);
    ctx.fillStyle = "#d4b483";
    peaks.forEach((peak, index) => {
      const x = index * barWidth;
      const h = Math.max(1, peak * bandHeight);
      ctx.globalAlpha = 0.28 + peak * 0.55;
      ctx.fillRect(x, mid - h / 2, Math.max(1, barWidth * 0.72), h);
    });
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(244, 232, 207, 0.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (rect.width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }

    for (const beatTime of beatTimes) {
      const x = duration > 0 ? (beatTime / duration) * rect.width : 0;
      const ignored = ignoredBeatTimes.some((time) => Math.abs(time - beatTime) <= 0.03);
      ctx.strokeStyle = ignored ? "rgba(126, 113, 93, 0.45)" : "rgba(212, 180, 131, 0.38)";
      ctx.lineWidth = ignored ? 1 : 1.5;
      ctx.setLineDash(ignored ? [4, 5] : [2, 6]);
      ctx.beginPath();
      ctx.moveTo(x, rect.height * 0.08);
      ctx.lineTo(x, rect.height * 0.92);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ignored ? "rgba(126, 113, 93, 0.65)" : "rgba(212, 180, 131, 0.75)";
      ctx.beginPath();
      ctx.rect(x - 3, rect.height * 0.9, 6, 6);
      ctx.fill();
    }

    for (const marker of markers) {
      const key = keyFor(marker);
      const x = duration > 0 ? (marker.at / duration) * rect.width : 0;
      const selected = selectedKey === key;
      ctx.strokeStyle = selected ? "#f3e5c1" : "rgba(221, 72, 54, 0.78)";
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(x, rect.height * 0.14);
      ctx.lineTo(x, rect.height * 0.88);
      ctx.stroke();
      ctx.fillStyle = selected ? "#f3e5c1" : "#dd4836";
      ctx.beginPath();
      ctx.arc(x, rect.height * 0.14, selected ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const playheadX = duration > 0 ? (currentTime / duration) * rect.width : 0;
    ctx.strokeStyle = "#f8f1de";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, rect.height);
    ctx.stroke();
  }, [beatTimes, currentTime, duration, ignoredBeatTimes, markers, peaks, selectedKey]);

  const hitBeat = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return null;
    const rect = canvas.getBoundingClientRect();
    if (clientY - rect.top < rect.height * 0.76) return null;
    let best: { time: number; distance: number } | null = null;
    for (const beatTime of beatTimes) {
      const x = (beatTime / duration) * rect.width;
      const distance = Math.abs(clientX - rect.left - x);
      if (distance <= 8 && (!best || distance < best.distance)) {
        best = { time: beatTime, distance };
      }
    }
    return best?.time ?? null;
  };

  const hitMarker = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return null;
    const rect = canvas.getBoundingClientRect();
    let best: { key: string; distance: number } | null = null;
    for (const marker of markers) {
      const x = (marker.at / duration) * rect.width;
      const distance = Math.abs(clientX - rect.left - x);
      if (distance <= 12 && (!best || distance < best.distance)) {
        best = { key: keyFor(marker), distance };
      }
    }
    return best?.key ?? null;
  };

  return (
    <canvas
      ref={canvasRef}
      className="timeline-waveform"
      onPointerDown={(event) => {
        const beatTime = hitBeat(event.clientX, event.clientY);
        const key = beatTime == null ? hitMarker(event.clientX) : null;
        const canvas = event.currentTarget;
        const time = timeFromEvent(canvas, event.clientX, duration);
        canvas.setPointerCapture(event.pointerId);
        if (key) {
          draggingKeyRef.current = key;
          onSelect(key);
        } else if (beatTime != null) {
          onToggleBeat(beatTime);
        } else {
          onSeek(time);
        }
      }}
      onPointerMove={(event) => {
        const key = draggingKeyRef.current;
        if (!key) return;
        onDragMarker(key, timeFromEvent(event.currentTarget, event.clientX, duration));
      }}
      onPointerUp={(event) => {
        draggingKeyRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
    />
  );
}
