"use client";
import { useState } from "react";
import { GripVertical, Plus, X, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import type { Section } from "@stayguide/shared";
import { MediaUpload } from "./media-upload";

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

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>Media</h4>
            </label>
            <MediaUpload
              section={section}
              onUpdate={(media) => onUpdate({ ...section, media })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
