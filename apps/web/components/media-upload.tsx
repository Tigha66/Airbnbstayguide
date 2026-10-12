"use client";
import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import type { Section } from "@stayguide/shared";

interface MediaUploadProps {
  section: Section;
  onUpdate: (media: Section["media"]) => void;
  disabled?: boolean;
}

export function MediaUpload({ section, onUpdate, disabled }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const media = section.media || [];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.currentTarget.files;
    if (!files) return;

    setUploading(true);
    try {
      for (const file of files) {
        // In production, upload to Vercel Blob
        // For now, create a data URL for demo
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const type = file.type.startsWith("video/") ? "video" : "photo";
            const newMedia = [...media, { url: String(event.target.result), type }];
            onUpdate(newMedia as Section["media"]);
          }
        };
        reader.readAsDataURL(file);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="media-upload">
      <div className="media-list">
        {media.length > 0 && (
          <div className="media-grid">
            {media.map((m, i) => (
              <div key={i} className="media-thumb">
                {m.type === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="Uploaded photo" />
                ) : (
                  <video src={m.url} />
                )}
                <button
                  type="button"
                  className="media-remove"
                  onClick={() => {
                    const updated = media.filter((_, idx) => idx !== i);
                    onUpdate(updated);
                  }}
                  disabled={disabled}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="media-upload-controls">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="button secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Upload size={14} />
          {uploading ? "Uploading..." : "Add photos or videos"}
        </button>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Supports JPG, PNG, WebM, MP4 · Up to 10 MB per file
        </p>
      </div>
    </div>
  );
}
