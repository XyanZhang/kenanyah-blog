import { useEffect, useState } from "react";

interface WaveformState {
  peaks: number[];
  beatTimes: number[];
  duration: number;
  error: string | null;
  loading: boolean;
}

const PEAK_COUNT = 720;

export function useAudioWaveform(src: string): WaveformState {
  const [state, setState] = useState<WaveformState>({
    peaks: [],
    beatTimes: [],
    duration: 0,
    error: null,
    loading: false,
  });

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setState({ peaks: [], beatTimes: [], duration: 0, error: null, loading: true });

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
          const beatTimes = detectBeatTimes(data, audioBuffer.sampleRate, audioBuffer.duration);
          setState({
            peaks,
            beatTimes,
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
            beatTimes: [],
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

function detectBeatTimes(data: Float32Array, sampleRate: number, duration: number) {
  const frameSeconds = 0.08;
  const hopSeconds = 0.04;
  const frameSize = Math.max(1, Math.floor(sampleRate * frameSeconds));
  const hopSize = Math.max(1, Math.floor(sampleRate * hopSeconds));
  const frames: { energy: number; zcr: number; brightness: number }[] = [];

  for (let start = 0; start + frameSize < data.length; start += hopSize) {
    let sum = 0;
    let highDelta = 0;
    let lowDelta = 0;
    let crossings = 0;
    for (let i = start; i < start + frameSize; i++) {
      const value = data[i] ?? 0;
      const prevValue = data[i - 1] ?? value;
      sum += value * value;
      if ((value >= 0 && prevValue < 0) || (value < 0 && prevValue >= 0)) crossings += 1;
      highDelta += Math.abs(value - prevValue);
      lowDelta += Math.abs(value + prevValue);
    }
    const energy = Math.sqrt(sum / frameSize);
    frames.push({
      energy,
      zcr: crossings / frameSize,
      brightness: highDelta / Math.max(0.000001, lowDelta),
    });
  }

  if (frames.length < 8) return [];

  const energies = frames.map((frame) => frame.energy);
  const novelty = frames.map((frame, index) => {
    if (index < 3) return 0;
    const prev = frames[index - 3]!;
    const energyRise = Math.max(0, frame.energy - prev.energy);
    const textureShift =
      Math.abs(frame.zcr - prev.zcr) * 2.4 + Math.abs(frame.brightness - prev.brightness) * 0.28;
    return energyRise * 1.4 + textureShift * Math.max(0.02, frame.energy);
  });

  const sorted = [...energies].sort((a, b) => a - b);
  const sortedNovelty = [...novelty].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const strong = sorted[Math.floor(sorted.length * 0.78)] ?? median;
  const noveltyStrong = sortedNovelty[Math.floor(sortedNovelty.length * 0.72)] ?? 0;
  const candidates: { time: number; score: number; kind: "peak" | "texture" | "fill" }[] = [];

  for (let i = 2; i < energies.length - 2; i++) {
    const current = energies[i] ?? 0;
    const prev = ((energies[i - 1] ?? 0) + (energies[i - 2] ?? 0)) / 2;
    const next = ((energies[i + 1] ?? 0) + (energies[i + 2] ?? 0)) / 2;
    const rise = current - prev;
    const localPeak = current >= prev && current >= next;
    const strongEnough = current >= strong || rise > median * 0.65;
    if (localPeak && strongEnough) {
      candidates.push({
        time: Number((i * hopSeconds).toFixed(3)),
        score: current + Math.max(0, rise) * 1.8,
        kind: "peak",
      });
    }

    const currentNovelty = novelty[i] ?? 0;
    const prevNovelty = ((novelty[i - 1] ?? 0) + (novelty[i - 2] ?? 0)) / 2;
    const nextNovelty = ((novelty[i + 1] ?? 0) + (novelty[i + 2] ?? 0)) / 2;
    const noveltyPeak = currentNovelty >= prevNovelty && currentNovelty >= nextNovelty;
    if (noveltyPeak && currentNovelty >= noveltyStrong && current >= median * 0.35) {
      candidates.push({
        time: Number((i * hopSeconds).toFixed(3)),
        score: currentNovelty + current * 0.35,
        kind: "texture",
      });
    }
  }

  const minGap = Math.max(0.45, Math.min(1.2, duration / 180));
  const selected = [...candidates]
    .sort((a, b) => b.score - a.score)
    .reduce<number[]>((times, candidate) => {
      if (times.every((time) => Math.abs(time - candidate.time) >= minGap)) {
        times.push(candidate.time);
      }
      return times;
    }, [])
    .sort((a, b) => a - b);

  return fillLongQuietGaps(selected, duration, Math.max(3.2, duration / 36));
}

function fillLongQuietGaps(times: number[], duration: number, maxGap: number) {
  const filled: number[] = [];
  const anchors = [0, ...times, duration].filter((time, index, arr) => {
    return index === 0 || Math.abs(time - (arr[index - 1] ?? 0)) > 0.2;
  });

  for (let i = 0; i < anchors.length - 1; i++) {
    const start = anchors[i]!;
    const end = anchors[i + 1]!;
    if (start > 0.2) filled.push(Number(start.toFixed(3)));
    const gap = end - start;
    if (gap > maxGap) {
      const count = Math.floor(gap / maxGap);
      for (let j = 1; j <= count; j++) {
        const time = start + (gap * j) / (count + 1);
        if (time > 0.2 && time < duration - 0.2) filled.push(Number(time.toFixed(3)));
      }
    }
  }

  return [...new Set(filled)].sort((a, b) => a - b);
}
