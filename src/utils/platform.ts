import { desktopApi, isDesktop } from "../platform/runtime";

export { isDesktop };

export const getPlatform = (): string => {
  if (typeof navigator === "undefined") return "unknown";
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Mac")) return "darwin";
  if (userAgent.includes("Windows")) return "win32";
  if (userAgent.includes("Linux")) return "linux";
  return "unknown";
};

/** Convert a native path through Tauri's registered local-media protocol. */
export const nativePathToUrl = (filePath: string): string =>
  desktopApi?.mediaUrl(filePath) ?? filePath;
