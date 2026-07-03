import { createRequire } from "node:module";
import { chmodSync, copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(root, "src-tauri/binaries");
const verifyOnly = process.argv.includes("--verify");

const targetTriple = () => {
  const configured = process.env.TAURI_ENV_TARGET_TRIPLE || process.env.TARGET;
  if (configured) return configured;
  const details = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
  const host = details.match(/^host:\s*(.+)$/m)?.[1]?.trim();
  if (!host) throw new Error("Unable to determine the Rust target triple");
  return host;
};

const target = targetTriple();
const extension = target.includes("windows") ? ".exe" : "";
const installers = [
  ["ffmpeg", require("@ffmpeg-installer/ffmpeg").path],
  ["ffprobe", require("@ffprobe-installer/ffprobe").path],
];

mkdirSync(outputDirectory, { recursive: true });

for (const [name, source] of installers) {
  const destination = resolve(outputDirectory, `${name}-${target}${extension}`);
  if (!verifyOnly) {
    if (!existsSync(source)) throw new Error(`${name} installer binary is missing: ${source}`);
    copyFileSync(source, destination);
    if (!extension) chmodSync(destination, 0o755);
  }
  if (!existsSync(destination) || statSync(destination).size === 0) {
    throw new Error(`${name} sidecar is missing or empty: ${destination}`);
  }
  if (!extension && (statSync(destination).mode & 0o111) === 0) {
    throw new Error(`${name} sidecar is not executable: ${destination}`);
  }
  const version = spawnSync(destination, ["-version"], { encoding: "utf8" });
  if (version.status !== 0) {
    throw new Error(`${name} sidecar failed its version check: ${version.stderr || version.error}`);
  }
  process.stdout.write(`${name}: ${destination}\n`);
}
