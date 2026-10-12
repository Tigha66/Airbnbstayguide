import type { Section } from "@stayguide/shared";

/**
 * Validates MIME type and returns media type or null if invalid.
 */
export function validateMediaType(mimeType: string): "photo" | "video" | null {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

/**
 * Detects media type from file extension.
 */
function detectMediaTypeFromExtension(url: string): "photo" | "video" | null {
  const urlWithoutQuery = url.split("?")[0];
  const ext = urlWithoutQuery.split(".").pop()?.toLowerCase() || "";

  const photoExts = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico"];
  const videoExts = ["mp4", "webm", "ogg", "mov", "avi", "mkv", "flv", "wmv"];

  if (photoExts.includes(ext)) return "photo";
  if (videoExts.includes(ext)) return "video";
  return null;
}

/**
 * Parses markdown image and link syntax to extract media URLs.
 * Supports ![alt](url) for images and [text](url) for video links.
 * Filters out data URLs and relative paths, only keeps absolute HTTP(S) URLs.
 */
export function parseMediaUrls(
  text: string,
): Array<{ url: string; type: "photo" | "video" }> {
  const mediaMap = new Map<string, "photo" | "video">();

  // Match ![alt](url) for images
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = imageRegex.exec(text)) !== null) {
    const url = match[2];
    if (isValidMediaUrl(url)) {
      const type = detectMediaTypeFromExtension(url);
      if (type === "photo" && !mediaMap.has(url)) {
        mediaMap.set(url, type);
      }
    }
  }

  // Match [text](url) for potential video links (only if not already matched as image)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = linkRegex.exec(text)) !== null) {
    const url = match[2];
    if (isValidMediaUrl(url) && !mediaMap.has(url)) {
      const type = detectMediaTypeFromExtension(url);
      if (type === "video") {
        mediaMap.set(url, type);
      }
    }
  }

  return Array.from(mediaMap, ([url, type]) => ({ url, type }));
}

/**
 * Checks if a URL is valid for media (absolute HTTP(S) URL, not data URL or relative path).
 */
function isValidMediaUrl(url: string): boolean {
  if (url.startsWith("data:")) return false;
  if (url.startsWith("/")) return false;
  if (url.startsWith(".")) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts media from section body markdown and merges with explicit media array.
 */
export function extractAndMergeMedia(section: Section): Section["media"] {
  const explicit = section.media || [];
  const parsed = parseMediaUrls(section.body);

  // Deduplicate by URL
  const seen = new Set<string>(explicit.map((m) => m.url));
  const additional = parsed.filter((m) => !seen.has(m.url));

  return [...explicit, ...additional];
}
