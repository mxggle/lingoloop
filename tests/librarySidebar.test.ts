import test from "node:test";
import assert from "node:assert/strict";

import type { FolderTreeNode } from "../src/types/electron.d.ts";
import {
  filterFolderTree,
  sortFolderTree,
} from "../src/components/electron/librarySidebar.ts";

const tree: FolderTreeNode[] = [
  {
    name: "zeta",
    path: "/media/zeta",
    type: "directory",
    children: [
      { name: "beta.mp3", path: "/media/zeta/beta.mp3", type: "file" },
      { name: "Alpha.mp3", path: "/media/zeta/Alpha.mp3", type: "file" },
    ],
  },
  { name: "gamma.mp4", path: "/media/gamma.mp4", type: "file" },
  {
    name: "Archive",
    path: "/media/Archive",
    type: "directory",
    children: [
      { name: "lesson.mov", path: "/media/Archive/lesson.mov", type: "file" },
    ],
  },
];

test("sortFolderTree sorts directories and files by name A-Z at every level", () => {
  const sorted = sortFolderTree(tree, { sortBy: "name", sortOrder: "asc" });

  assert.deepEqual(sorted.map((node) => node.name), ["Archive", "zeta", "gamma.mp4"]);
  assert.deepEqual(sorted[1].children?.map((node) => node.name), ["Alpha.mp3", "beta.mp3"]);
});

test("filterFolderTree preserves matching file ancestors", () => {
  const filtered = filterFolderTree(tree, "lesson");

  assert.deepEqual(filtered.map((node) => node.name), ["Archive"]);
  assert.deepEqual(filtered[0].children?.map((node) => node.name), ["lesson.mov"]);
});

test("sortFolderTree falls back to A-Z when recent metadata is unavailable", () => {
  const sorted = sortFolderTree(tree, { sortBy: "recent", sortOrder: "desc" });

  assert.deepEqual(sorted.map((node) => node.name), ["Archive", "zeta", "gamma.mp4"]);
});
