"use client";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { sectionTemplates } from "@stayguide/shared";
import type { SectionTemplate } from "@stayguide/shared";
import { GuideIcon } from "./ui";
import { Modal } from "./modal";

interface TemplatePickerModalProps {
  onSelect: (template: SectionTemplate) => void;
  onClose: () => void;
  tr: (key: string, params?: Record<string, any>) => string;
}

export function TemplatePickerModal({
  onSelect,
  onClose,
  tr,
}: TemplatePickerModalProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<
    "all" | "basics" | "house-rules" | "amenities" | "local" | "custom"
  >("all");

  const categories = [
    { id: "all", label: tr("All") },
    { id: "basics", label: tr("Basics") },
    { id: "house-rules", label: tr("House rules") },
    { id: "amenities", label: tr("Amenities") },
    { id: "local", label: tr("Local") },
  ] as const;

  const filtered = sectionTemplates.filter((t) => {
    const matchesSearch = (
      t.title + " " + t.body
    ).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || t.category === category;
    return matchesSearch && matchesCategory;
  });

  const featured = filtered.filter((t) => t.featured);
  const other = filtered.filter((t) => !t.featured);

  return (
    <Modal
      title={tr("Choose a template")}
      close={onClose}
      closeLabel={tr("Close dialog")}
    >
      <p>{tr("Start with a pre-made section or create from scratch.")}</p>

      <div className="template-picker-controls">
        <div className="search-field">
          <Search size={16} />
          <input
            placeholder={tr("Search templates…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="category-tabs">
          {categories.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? "active" : ""}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {featured.length > 0 && (
        <div className="template-section">
          <h3>{tr("Popular")}</h3>
          <div className="template-grid">
            {featured.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onSelect={() => {
                  onSelect(t);
                  onClose();
                }}
                tr={tr}
              />
            ))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div className="template-section">
          <h3>{tr("More options")}</h3>
          <div className="template-grid">
            {other.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onSelect={() => {
                  onSelect(t);
                  onClose();
                }}
                tr={tr}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="template-empty">
          <p>{tr("No templates match your search.")}</p>
          <button onClick={() => setSearch("")} className="text-link">
            {tr("Clear search")}
          </button>
        </div>
      )}

      <div className="template-footer">
        <button onClick={onClose} className="button secondary">
          {tr("Cancel")}
        </button>
      </div>
    </Modal>
  );
}

interface TemplateCardProps {
  template: SectionTemplate;
  onSelect: () => void;
  tr: (key: string) => string;
}

function TemplateCard({ template, onSelect, tr }: TemplateCardProps) {
  const preview = template.body.slice(0, 80).replace(/\*\*/g, "");

  return (
    <button
      onClick={onSelect}
      className="template-card"
      aria-label={tr("Use template: {title}", { title: template.title })}
    >
      <div className="template-icon">
        <GuideIcon name={template.icon} size={20} />
      </div>
      <h4>{template.title}</h4>
      <p className="template-preview">{preview}…</p>
      <span className="template-use">{tr("Use")}</span>
    </button>
  );
}
