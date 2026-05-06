import test from "node:test";
import assert from "node:assert/strict";

import { mergePersistedLayoutState } from "../src/stores/layoutStore.ts";

test("mergePersistedLayoutState preserves new panel defaults for legacy layout storage", () => {
  const merged = mergePersistedLayoutState(
    {
      layoutSettings: {
        showPlayer: false,
        showWaveform: true,
        showTranscript: true,
        showControls: true,
      },
    },
    {
      layoutSettings: {
        showPlayer: true,
        showWaveform: true,
        showTranscript: true,
        showControls: true,
        transcriptPanelVisible: true,
        transcriptPanelCollapsed: false,
        videoPanelVisible: true,
        videoPanelCollapsed: false,
        timelinePanelVisible: true,
        timelinePanelCollapsed: false,
      },
    },
  );

  assert.equal(merged.layoutSettings.showPlayer, false);
  assert.equal(merged.layoutSettings.transcriptPanelVisible, true);
  assert.equal(merged.layoutSettings.videoPanelVisible, true);
  assert.equal(merged.layoutSettings.timelinePanelVisible, true);
});
