import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("player timeline panel keeps a conservative vertical resize ceiling", () => {
  const source = read("src/pages/PlayerPage.tsx");

  assert.match(source, /id="player-timeline-panel"[\s\S]*?maxSize="38%"/);
});

test("timeline and waveform surfaces cap visual stretch without creating horizontal scroll", () => {
  const timeline = read("src/components/player/TimelinePanel.tsx");
  const waveform = read("src/components/waveform/WaveformVisualizer.tsx");

  assert.match(timeline, /max-h-\[360px\]/);
  assert.match(timeline, /overflow-y-auto overflow-x-hidden/);
  assert.match(waveform, /max-w-\[1280px\]/);
  assert.match(waveform, /max-h-\[260px\]/);
});
