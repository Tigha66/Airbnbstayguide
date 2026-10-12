"use client";
import { useState } from "react";
import { GripVertical, Plus, X, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import type { Section } from "@stayguide/shared";

interface SectionEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
}

export function SectionEditor({ section, onUpdate, onDelete, isDragging, dragHandle }: SectionEditorProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`section-editor ${isDragging ? "dragging" : ""}`}>
      <div className="section-header">
        {dragHandle && <div className="drag-handle">{dragHandle}</div>}
        <button
          type="button"
          className="section-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span className="section-icon">{section.icon}</span>
          <span className="section-title">{section.title}</span>
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onDelete}
          aria-label="Delete section"
        >
          <X size={16} />
        </button>
      </div>

      {expanded && (
        <div className="section-content">
          <label>
            Title
            <input
              type="text"
              value={section.title}
              onChange={(e) => onUpdate({ ...section, title: e.target.value })}
              maxLength={120}
            />
          </label>

          <label>
            Content
            <textarea
              value={section.body}
              onChange={(e) => onUpdate({ ...section, body: e.target.value })}
              maxLength={20000}
              rows={6}
              placeholder="Add your content here. Markdown is supported."
            />
          </label>

          {section.media && section.media.length > 0 && (
            <div className="section-media">
              <h4>Media</h4>
              <div className="media-grid">
                {section.media.map((m, i) => (
                  <div key={i} className="media-item">
                    {m.type === "photo" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="Section photo" />
                    ) : (
                      <video src={m.url} controls />
                    )}
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        const updated = {
                          ...section,
                          media: section.media?.filter((_, idx) => idx !== i),
                        };
                        onUpdate(updated);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="section-actions">
            <button className="button secondary" type="button" disabled>
              <ImageIcon size={14} />
              Add photo
            </button>
            <button className="button secondary" type="button" disabled>
              <VideoIcon size={14} />
              Add video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
