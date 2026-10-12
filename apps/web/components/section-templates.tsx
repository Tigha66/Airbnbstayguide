"use client";
import { useState } from "react";
import { Plus, ChevronRight, BookOpen } from "lucide-react";
import { starterTemplates, templateById, type Section } from "@stayguide/shared";

interface TemplateSelectorProps {
  onSelect: (sections: Section[]) => void;
  onClose: () => void;
}

export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const template = selected ? templateById(selected) : null;

  return (
    <div className="template-selector">
      <div className="template-grid">
        {starterTemplates.map((t) => (
          <button
            key={t.id}
            className={`template-card ${selected === t.id ? "selected" : ""}`}
            onClick={() => setSelected(t.id)}
            type="button"
          >
            <div className="template-icon">{t.icon}</div>
            <h3>{t.name}</h3>
            <p>{t.tagline}</p>
            <span className="template-count">
              {t.sections.length} sections
            </span>
          </button>
        ))}
      </div>

      {template && (
        <div className="template-preview">
          <h3>{template.name}</h3>
          <p>{template.tagline}</p>
          <div className="template-sections">
            <h4>Sections included:</h4>
            <ul>
              {template.sections.map((s) => (
                <li key={s.id}>
                  <BookOpen size={14} />
                  {s.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="template-actions">
            <button
              className="button"
              onClick={() => {
                onSelect(template.sections.map((s) => ({ ...s })));
                onClose();
              }}
              type="button"
            >
              <Plus size={14} />
              Use this template
            </button>
            <button
              className="button secondary"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SectionTemplatesProps {
  onInsertSections: (sections: Section[]) => void;
}

export function SectionTemplates({ onInsertSections }: SectionTemplatesProps) {
  const [showSelector, setShowSelector] = useState(false);

  if (showSelector) {
    return (
      <TemplateSelector
        onSelect={onInsertSections}
        onClose={() => setShowSelector(false)}
      />
    );
  }

  return (
    <div className="section-templates">
      <button
        className="button secondary"
        onClick={() => setShowSelector(true)}
        type="button"
      >
        <Plus size={14} />
        Add from template
      </button>
    </div>
  );
}
