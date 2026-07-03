import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/desktop/FolderBrowser.tsx", import.meta.url),
  "utf8",
);

test("folder trees and watchers approve persisted source roots before native access", () => {
  assert.match(
    source,
    /const loadTree[\s\S]*?await desktopApi\.approvePath\(folderPath\)[\s\S]*?listMediaTree\(folderPath\)/,
  );
  assert.match(
    source,
    /watchApprovedFolder[\s\S]*?await api\.approvePath\(folderPath\)[\s\S]*?watchMediaTree\(folderPath/,
  );
});
