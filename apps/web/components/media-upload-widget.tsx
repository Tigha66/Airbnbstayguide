"use client";
import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import type { MediaItem } from "@stayguide/shared";

interface MediaUploadWidgetProps {
  onUpload: (media: MediaItem) => void;
  onRemove: (id: string) => void;
  media: MediaItem[];
  tr: (key: string, params?: Record<string, any>) => string;
}

export function MediaUploadWidget({
  onUpload,
  onRemove,
  media,
  tr,
}: MediaUploadWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function handleFiles(files: FileList) {
    setIsDragging(false);
    setUploading(true);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      try {
        // In production, upload to Supabase/Cloudinary
        // For now, use data URL for demo
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          onUpload({
            id: crypto.randomUUID(),
            url,
            caption: "",
            alt: file.name.replace(/\.[^/.]+$/, ""),
          });
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }

    setUploading(false);
  }

  function startEditing(item: MediaItem) {
    setEditingId(item.id);
    setEditCaption(item.caption || "");
    setEditAlt(item.alt || "");
  }

  function saveEdits(id: string) {
    const item = media.find((m) => m.id === id);
    if (item) {
      onUpload({ ...item, caption: editCaption, alt: editAlt });
      setEditingId(null);
    }
  }

  return (
    <div className="media-widget">
      <div
        className={`upload-zone ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <div className="upload-progress">
            <Loader2 size={32} className="animate-spin" />
            <p>{tr("Uploading images…")}</p>
          </div>
        ) : (
          <>
            <Upload size={32} />
            <p>{tr("Drag images here or click to browse")}</p>
            <small>{tr("Supports PNG, JPG, WebP. Up to 10 MB each.")}</small>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="button secondary"
              style={{ marginTop: 12 }}
            >
              {tr("Browse files")}
            </button>
          </>
        )}
      </div>

      {media.length > 0 && (
        <div className="media-gallery">
          <h4>{tr("Uploaded images ({n})", { n: media.length })}</h4>
          <div className="media-grid">
            {media.map((item) => (
              <div key={item.id} className="media-item">
                {editingId === item.id ? (
                  <div className="media-edit-form">
                    <img src={item.url} alt={item.alt} />
                    <label>
                      {tr("Caption (optional)")}
                      <input
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder={tr("e.g. Garden view from the patio")}
                        maxLength={100}
                      />
                    </label>
                    <label>
                      {tr("Alt text (for accessibility)")}
                      <input
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        placeholder={tr("e.g. A sunny garden with olive trees")}
                        maxLength={150}
                      />
                    </label>
                    <div className="button-group">
                      <button
                        type="button"
                        onClick={() => saveEdits(item.id)}
                        className="button small"
                      >
                        {tr("Save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="button secondary small"
                      >
                        {tr("Cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img src={item.url} alt={item.alt} />
                    <div className="media-info">
                      {item.caption && <p className="caption">{item.caption}</p>}
                      {item.alt && <small className="alt">{item.alt}</small>}
                    </div>
                    <div className="media-actions">
                      <button
                        type="button"
                        onClick={() => startEditing(item)}
                        className="icon-button"
                        aria-label={tr("Edit image")}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="icon-button delete"
                        aria-label={tr("Delete image")}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
