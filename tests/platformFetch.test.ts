import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { createPlatformFetch } from "../src/platform/runtime.ts";
import type { DesktopFetchOptions, DesktopFetchResult } from "../src/types/desktop.ts";

const successfulResult: DesktopFetchResult = {
  ok: true,
  status: 200,
  statusText: "OK",
  data: "response",
  headers: { "content-type": "text/plain" },
};

test("platformFetch preserves string request method, headers, and body", async () => {
  const calls: Array<[string, DesktopFetchOptions]> = [];
  const fetch = createPlatformFetch(() => ({
    fetch: async (url, options) => {
      calls.push([url, options]);
      return successfulResult;
    },
  }));

  const response = await fetch("https://example.test/messages", {
    method: "POST",
    headers: { Authorization: "Bearer token" },
    body: "hello",
  });

  assert.equal(await response.text(), "response");
  assert.deepEqual(calls, [["https://example.test/messages", {
    method: "POST",
    headers: {
      authorization: "Bearer token",
      "content-type": "text/plain;charset=UTF-8",
    },
    body: "hello",
  }]]);
});

test("platformFetch serializes FormData with generated boundary and body bytes", async () => {
  let captured: DesktopFetchOptions | undefined;
  const fetch = createPlatformFetch(() => ({
    fetch: async (_url, options) => {
      captured = options;
      return successfulResult;
    },
  }));
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", new Blob([Uint8Array.from([0, 1, 2])], { type: "audio/wav" }), "audio.wav");

  await fetch("https://example.test/transcriptions", { method: "POST", body: form });

  assert.match(captured?.headers["content-type"] ?? "", /^multipart\/form-data; boundary=/);
  assert.equal(captured?.body, undefined);
  assert.ok(captured?.bodyBytes && captured.bodyBytes.length > 3);
  const serialized = new TextDecoder().decode(Uint8Array.from(captured?.bodyBytes ?? []));
  assert.match(serialized, /name="model"/);
  assert.match(serialized, /whisper-1/);
  assert.match(serialized, /filename="audio.wav"/);
});

test("platformFetch preserves Blob and Request bodies as bytes", async () => {
  const captured: DesktopFetchOptions[] = [];
  const fetch = createPlatformFetch(() => ({
    fetch: async (_url, options) => {
      captured.push(options);
      return successfulResult;
    },
  }));

  await fetch("https://example.test/blob", {
    method: "PUT",
    body: new Blob([Uint8Array.from([4, 5, 6])], { type: "application/octet-stream" }),
  });
  await fetch(new Request("https://example.test/request", {
    method: "POST",
    body: Uint8Array.from([7, 8]),
  }));
  await fetch("https://example.test/buffer", {
    method: "PATCH",
    body: Uint8Array.from([9, 10]).buffer,
  });

  assert.deepEqual(captured[0].bodyBytes, [4, 5, 6]);
  assert.equal(captured[0].headers["content-type"], "application/octet-stream");
  assert.deepEqual(captured[1].bodyBytes, [7, 8]);
  assert.deepEqual(captured[2].bodyBytes, [9, 10]);
});

test("platformFetch rejects an already-aborted request without invoking desktop", async () => {
  const desktopFetch = mock.fn(async () => successfulResult);
  const fetch = createPlatformFetch(() => ({ fetch: desktopFetch }));
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    fetch("https://example.test", { signal: controller.signal }),
    (error: unknown) => error instanceof DOMException && error.name === "AbortError",
  );
  assert.equal(desktopFetch.mock.callCount(), 0);
});

test("platformFetch uses the injected web transport when desktop is unavailable", async () => {
  const webFetch = mock.fn(async () => new Response("web"));
  const fetch = createPlatformFetch(() => null, webFetch as typeof globalThis.fetch);

  assert.equal(await (await fetch("https://example.test")).text(), "web");
  assert.equal(webFetch.mock.callCount(), 1);
});
