import { useEffect, useState } from "react";

interface WaveformState {
  peaks: number[];
  duration: number;
  error: string | null;
  loading: boolean;
}

const PEAK_COUNT = 720;

export function useAudioWaveform(src: string): WaveformState {
  const [state, setState] = useState<WaveformState>({
    peaks: [],
    duration: 0,
    error: null,
    loading: false,
  });

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setState({ peaks: [], duration: 0, error: null, loading: true });

    fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error("fetch failed");
        return response.arrayBuffer();
      })
      .then(async (buffer) => {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContextCtor();
        try {
          const audioBuffer = await context.decodeAudioData(buffer.slice(0));
          if (cancelled) return;
          const data = audioBuffer.getChannelData(0);
          const blockSize = Math.max(1, Math.floor(data.length / PEAK_COUNT));
          const peaks: number[] = [];
          for (let i = 0; i < PEAK_COUNT; i++) {
            let sum = 0;
            const start = i * blockSize;
            const end = Math.min(start + blockSize, data.length);
            for (let j = start; j < end; j++) sum += Math.abs(data[j] ?? 0);
            peaks.push(Math.min(1, (sum / Math.max(1, end - start)) * 4));
          }
          setState({
            peaks,
            duration: audioBuffer.duration,
            error: null,
            loading: false,
          });
        } finally {
          void context.close();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            peaks: [],
            duration: 0,
            error: "BGM 加载失败，请确认 public/music 里已有对应文件。",
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return state;
}
