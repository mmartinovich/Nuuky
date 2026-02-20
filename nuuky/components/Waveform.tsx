import React from "react";
import { View } from "react-native";

// ─── Shared Constants ────────────────────────────────────────────────────────

export const BAR_W = 3;
export const BAR_GAP = 2;
export const BAR_UNIT = BAR_W + BAR_GAP; // 5px per slot
export const WAVEFORM_H = 80;
export const SAMPLES_PER_SECOND = 10; // metering fires every ~100ms

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate deterministic bar heights from a string seed (for playback without real data) */
export function generateWaveformBars(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = ((hash << 5) - hash + i * 7) | 0;
    const normalized = (Math.abs(hash) % 1000) / 1000;
    bars.push(0.15 + normalized * 0.7);
  }
  return bars;
}

// ─── Recording Waveform (live, with cursor + dotted future line) ─────────────

interface RecordingWaveformProps {
  data: number[];
  containerWidth: number;
  accentColor: string;
  maxDurationSeconds: number;
}

export const RecordingWaveform = React.memo(function RecordingWaveform({
  data,
  containerWidth,
  accentColor,
  maxDurationSeconds,
}: RecordingWaveformProps) {
  if (containerWidth === 0 || data.length === 0) {
    // Empty state: show dotted placeholder line
    const dotSpacing = 9;
    const dotCount = Math.floor(containerWidth / dotSpacing);
    return (
      <View style={{ width: containerWidth, height: WAVEFORM_H }}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: i * dotSpacing,
              top: WAVEFORM_H / 2 - 1,
              width: 5,
              height: 2,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderRadius: 1,
            }}
          />
        ))}
      </View>
    );
  }

  const slotCount = Math.floor(containerWidth / BAR_UNIT);
  const samplesPerSlot = Math.max(
    1,
    Math.floor((maxDurationSeconds * SAMPLES_PER_SECOND) / slotCount)
  );
  const currentSlot = Math.floor(data.length / samplesPerSlot);
  const cursorX = Math.min(currentSlot * BAR_UNIT, containerWidth - 2);
  const futureStart = cursorX + 10;
  const dotSpacing = 9;
  const dotCount = Math.max(
    0,
    Math.floor((containerWidth - futureStart) / dotSpacing)
  );

  return (
    <View style={{ width: containerWidth, height: WAVEFORM_H }}>
      {/* Filled bars (recorded audio) */}
      {Array.from({ length: Math.min(currentSlot, slotCount) }).map((_, i) => {
        const start = i * samplesPerSlot;
        const end = Math.min(start + samplesPerSlot, data.length);
        const slice = data.slice(start, end);
        const avg =
          slice.length > 0
            ? slice.reduce((a, b) => a + b, 0) / slice.length
            : 0;
        const barH = Math.max(3, avg * (WAVEFORM_H - 16));
        const x = i * BAR_UNIT;
        const opacity = 0.45 + (i / Math.max(currentSlot - 1, 1)) * 0.55;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: (WAVEFORM_H - barH) / 2,
              width: BAR_W,
              height: barH,
              backgroundColor: accentColor,
              borderRadius: BAR_W / 2,
              opacity,
            }}
          />
        );
      })}

      {/* Red cursor line */}
      <View
        style={{
          position: "absolute",
          left: cursorX,
          top: 8,
          bottom: 8,
          width: 2,
          backgroundColor: "#EF4444",
          borderRadius: 1,
        }}
      />

      {/* Future dotted line */}
      {Array.from({ length: dotCount }).map((_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: futureStart + i * dotSpacing,
            top: WAVEFORM_H / 2 - 1,
            width: 5,
            height: 2,
            backgroundColor: "rgba(255,255,255,0.14)",
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
});

// ─── Static Waveform (preview + playback) ────────────────────────────────────

interface StaticWaveformProps {
  /** Amplitude data (0-1). Real metering data or generated via generateWaveformBars. */
  data: number[];
  containerWidth: number;
  accentColor: string;
  /** Height of the waveform. Defaults to 48. */
  height?: number;
  /** Playback progress 0-1. When provided, shows played/unplayed opacity + cursor. */
  progress?: number;
  /** Max recording duration in seconds. When provided, bars are scaled to this duration instead of stretching to fill. */
  maxDurationSeconds?: number;
}

export const StaticWaveform = React.memo(function StaticWaveform({
  data,
  containerWidth,
  accentColor,
  height = 48,
  progress,
  maxDurationSeconds,
}: StaticWaveformProps) {
  if (containerWidth === 0 || data.length === 0) return null;

  const slotCount = Math.floor(containerWidth / BAR_UNIT);
  const samplesPerSlot = maxDurationSeconds
    ? Math.max(1, Math.floor((maxDurationSeconds * SAMPLES_PER_SECOND) / slotCount))
    : Math.max(1, Math.ceil(data.length / slotCount));
  const slotsToShow = Math.min(
    slotCount,
    Math.ceil(data.length / samplesPerSlot)
  );
  const hasProgress = progress != null && progress > 0;

  return (
    <View style={{ width: containerWidth, height }}>
      {Array.from({ length: slotsToShow }).map((_, i) => {
        const start = i * samplesPerSlot;
        const end = Math.min(start + samplesPerSlot, data.length);
        const slice = data.slice(start, end);
        const avg =
          slice.length > 0
            ? slice.reduce((a, b) => a + b, 0) / slice.length
            : 0;
        const barH = Math.max(3, avg * (height - 8));
        const isPlayed = hasProgress && i / slotsToShow <= progress!;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: i * BAR_UNIT,
              top: (height - barH) / 2,
              width: BAR_W,
              height: barH,
              backgroundColor: accentColor,
              borderRadius: BAR_W / 2,
              opacity: hasProgress ? (isPlayed ? 1 : 0.25) : 0.5,
            }}
          />
        );
      })}

      {/* Playback cursor */}
      {hasProgress && progress! < 1 && (
        <View
          style={{
            position: "absolute",
            left: progress! * containerWidth,
            top: 4,
            bottom: 4,
            width: 2,
            backgroundColor: accentColor,
            borderRadius: 1,
          }}
        />
      )}
    </View>
  );
});
