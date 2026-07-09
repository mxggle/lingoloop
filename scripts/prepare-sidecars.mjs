import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
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

const ytDlpRelease = "2026.07.04";
const ytDlpAssets = target.includes("apple-darwin")
  ? ["yt-dlp_macos", "498bd0dae17855c599d371d68ec5bafc439a9d8640e838be25c765a9792f261b"]
  : target.includes("aarch64") && target.includes("windows")
    ? ["yt-dlp_arm64.exe", "1525690b037ecc0bb677e38e7147b0025179cbc9a8d0c57264e3100b18099280"]
    : target.includes("windows")
      ? ["yt-dlp.exe", "52fe3c26dcf71fbdc85b528589020bb0b8e383155cfa81b64dd447bbe35e24b8"]
      : target.includes("aarch64")
        ? ["yt-dlp_linux_aarch64", "b6ce97646773070d7a7ffd6bbbdcaecb47c48483909c54c915bf08a7a9b5e0b1"]
        : ["yt-dlp_linux", "6bbb3d314cde4febe36e5fa1d55462e29c974f63444e707871834f6d8cc210ae"];

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

const [ytDlpAsset, ytDlpSha256] = ytDlpAssets;
const ytDlpDestination = resolve(outputDirectory, `yt-dlp-${target}${extension}`);
const hasExpectedYtDlp = () => existsSync(ytDlpDestination)
  && createHash("sha256").update(readFileSync(ytDlpDestination)).digest("hex") === ytDlpSha256;
if (!verifyOnly && !hasExpectedYtDlp()) {
  const url = `https://github.com/yt-dlp/yt-dlp/releases/download/${ytDlpRelease}/${ytDlpAsset}`;
  const temporary = `${ytDlpDestination}.download`;
  rmSync(temporary, { force: true });
  execFileSync("curl", ["--fail", "--location", "--silent", "--show-error", "--output", temporary, url]);
  const temporaryDigest = createHash("sha256").update(readFileSync(temporary)).digest("hex");
  if (temporaryDigest !== ytDlpSha256) {
    rmSync(temporary, { force: true });
    throw new Error(`yt-dlp downloaded file checksum mismatch: ${url}`);
  }
  renameSync(temporary, ytDlpDestination);
  if (!extension) chmodSync(ytDlpDestination, 0o755);
}
if (!existsSync(ytDlpDestination) || statSync(ytDlpDestination).size === 0) {
  throw new Error(`yt-dlp sidecar is missing or empty: ${ytDlpDestination}`);
}
const ytDlpDigest = createHash("sha256").update(readFileSync(ytDlpDestination)).digest("hex");
if (ytDlpDigest !== ytDlpSha256) {
  throw new Error(`yt-dlp checksum mismatch: ${ytDlpDestination}`);
}
const ytDlpVersion = spawnSync(ytDlpDestination, ["--version"], { encoding: "utf8" });
if (ytDlpVersion.status !== 0) throw new Error(`yt-dlp failed its version check: ${ytDlpVersion.stderr || ytDlpVersion.error}`);
process.stdout.write(`yt-dlp: ${ytDlpDestination}\n`);
