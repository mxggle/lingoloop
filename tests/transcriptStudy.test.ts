import assert from "node:assert/strict";
import test from "node:test";

import { inferTranscriptLevelSystem } from "../src/utils/transcriptStudy";

test("auto level system detects Japanese transcript text", () => {
  assert.equal(
    inferTranscriptLevelSystem("auto", "これは日本語のトランスクリプトです。"),
    "jlpt"
  );
});

test("auto level system defaults non-Japanese transcript text to CEFR", () => {
  assert.equal(
    inferTranscriptLevelSystem("auto", "This is an English transcript."),
    "cefr"
  );
});

test("explicit transcript language takes precedence over text detection", () => {
  assert.equal(inferTranscriptLevelSystem("en-US", "これは日本語です。"), "cefr");
  assert.equal(inferTranscriptLevelSystem("ja-JP", "English text"), "jlpt");
});
