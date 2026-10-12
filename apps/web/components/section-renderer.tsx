"use client";
import { ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Section, Property } from "@stayguide/shared";
import { LocalRecommendations } from "./local-recommendations";
import { GuideIcon } from "./ui";

interface SectionRendererProps {
  section: Section;
  property: Property;
  editable?: boolean;
  onUpdate?: (section: Section) => void;
}

export function SectionRenderer({
  section,
  property,
  editable = false,
  onUpdate,
}: SectionRendererProps) {
  if (section.type === "localRecommendations") {
    return (
      <details className="guest-section">
        <summary>
          <GuideIcon name={section.icon} />
          {section.title}
          <ChevronRight size={15} />
        </summary>
        <div style={{ padding: "12px 0" }}>
          <LocalRecommendations
            recommendations={property.recommendations}
            editable={editable}
            propertyLocation={property.location}
            onAddRecommendation={(rec) => {
              if (editable && onUpdate) {
                const updated = {
                  ...property,
                  recommendations: [...(property.recommendations || []), rec],
                };
                // Notify parent that property changed
                onUpdate(section);
              }
            }}
            onDeleteRecommendation={(id) => {
              if (editable && onUpdate) {
                const updated = {
                  ...property,
                  recommendations: property.recommendations?.filter((r) => r.id !== id),
                };
                onUpdate(section);
              }
            }}
          />
        </div>
      </details>
    );
  }

  return (
    <details className="guest-section">
      <summary>
        <GuideIcon name={section.icon} />
        {section.title}
        <ChevronRight size={15} />
      </summary>
      <div className="markdown">
        <ReactMarkdown>{section.body}</ReactMarkdown>
      </div>
    </details>
  );
}
