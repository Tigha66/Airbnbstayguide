import { describe, it, expect } from "vitest";
import { parseMediaUrls, validateMediaType } from "./media";

describe("media", () => {
  describe("validateMediaType", () => {
    it("validates photo MIME types", () => {
      expect(validateMediaType("image/jpeg")).toBe("photo");
      expect(validateMediaType("image/png")).toBe("photo");
      expect(validateMediaType("image/webp")).toBe("photo");
      expect(validateMediaType("image/gif")).toBe("photo");
    });

    it("validates video MIME types", () => {
      expect(validateMediaType("video/mp4")).toBe("video");
      expect(validateMediaType("video/webm")).toBe("video");
      expect(validateMediaType("video/quicktime")).toBe("video");
      expect(validateMediaType("video/x-msvideo")).toBe("video");
    });

    it("rejects invalid types", () => {
      expect(validateMediaType("audio/mp3")).toBeNull();
      expect(validateMediaType("text/plain")).toBeNull();
      expect(validateMediaType("application/pdf")).toBeNull();
    });
  });

  describe("parseMediaUrls", () => {
    it("extracts media URLs from markdown", () => {
      const text = `
Some content here.

![Pool photo](https://example.com/pool.jpg)

More text.

[Garden video](https://example.com/garden.mp4)
      `;
      const media = parseMediaUrls(text);
      expect(media).toHaveLength(2);
      expect(media[0]).toEqual({ url: "https://example.com/pool.jpg", type: "photo" });
      expect(media[1]).toEqual({ url: "https://example.com/garden.mp4", type: "video" });
    });

    it("detects media type from file extension", () => {
      const text = `
![image](https://example.com/photo.png)
[video](https://example.com/clip.webm)
      `;
      const media = parseMediaUrls(text);
      expect(media).toHaveLength(2);
      expect(media[0].type).toBe("photo");
      expect(media[1].type).toBe("video");
    });

    it("handles mixed image and video formats", () => {
      const text = `
![](https://example.com/a.jpg)
![](https://example.com/b.webp)
[](https://example.com/c.mp4)
[](https://example.com/d.webm)
      `;
      const media = parseMediaUrls(text);
      expect(media).toHaveLength(4);
      expect(media.filter((m) => m.type === "photo")).toHaveLength(2);
      expect(media.filter((m) => m.type === "video")).toHaveLength(2);
    });

    it("skips data URLs and relative paths", () => {
      const text = `
![](data:image/png;base64,abc123)
![](/images/photo.jpg)
![](../photos/pic.png)
      `;
      const media = parseMediaUrls(text);
      expect(media).toHaveLength(0);
    });

    it("handles URLs with query parameters", () => {
      const text = `
![](https://example.com/photo.jpg?w=400&h=300)
[](https://example.com/video.mp4?quality=high)
      `;
      const media = parseMediaUrls(text);
      expect(media).toHaveLength(2);
      expect(media[0]).toEqual({ url: "https://example.com/photo.jpg?w=400&h=300", type: "photo" });
      expect(media[1]).toEqual({ url: "https://example.com/video.mp4?quality=high", type: "video" });
    });

    it("returns empty array for text without media", () => {
      const text = "Just plain text with no images or videos.";
      const media = parseMediaUrls(text);
      expect(media).toHaveLength(0);
    });

    it("handles duplicate URLs by keeping only first occurrence", () => {
      const text = `
![](https://example.com/photo.jpg)
![](https://example.com/photo.jpg)
      `;
      const media = parseMediaUrls(text);
      expect(media).toHaveLength(1);
    });
  });
});
