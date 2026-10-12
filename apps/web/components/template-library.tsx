"use client";
import { useState } from "react";
import {
  Coffee,
  Heart,
  Key,
  MapPin,
  Sun,
  Wifi,
  X,
  Check,
  Plus,
} from "lucide-react";
import { Modal } from "./modal";
import { useAppLocale } from "./app-locale";
import type { Section } from "@stayguide/shared";

const sectionTemplates: Array<{
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  description: string;
}> = [
  {
    id: "welcome",
    type: "welcome",
    title: "A warm welcome",
    icon: "book",
    description: "Introduce guests and set expectations",
    body: "Welcome! We're so happy to have you. This guide has everything you need for a relaxed, easy stay — arrival, Wi-Fi, the little how-tos and our favourite local spots.\n\nIf anything is ever unclear, message us any time. Make yourself at home.",
  },
  {
    id: "arrival",
    type: "arrival",
    title: "A lovely arrival",
    icon: "key",
    description: "Check-in details and entry instructions",
    body: "**Check-in:** from [3:00 PM]\n\n**Getting in:** [Describe how to find the entrance and get inside — door code, lockbox location, or key handover.]\n\nTell us your estimated arrival time so everything is ready for you. Arriving early? [Let us know — we'll do our best.]",
  },
  {
    id: "wifi",
    type: "wifi",
    title: "Get connected",
    icon: "wifi",
    description: "Wi-Fi network and connection troubleshooting",
    body: "**Network:** [your Wi-Fi name]\n**Password:** [your Wi-Fi password]\n\nYou'll also find these on the card by the [entryway]. If the connection drops, unplug the router for 30 seconds and plug it back in.",
  },
  {
    id: "rules",
    type: "rules",
    title: "A little house etiquette",
    icon: "heart",
    description: "House rules and guest expectations",
    body: "A few small things keep this a lovely place for everyone:\n\n- Quiet hours [10:00 PM – 8:00 AM]\n- No smoking indoors\n- No parties or unregistered overnight guests\n- [Pets: welcome only with prior approval]\n- [Please remove shoes indoors]",
  },
  {
    id: "checkout",
    type: "checkout",
    title: "Until next time",
    icon: "sun",
    description: "Checkout instructions and closing duties",
    body: "**Checkout:** by [11:00 AM]\n\nBefore you go, if you have a moment:\n- Load any used dishes in the dishwasher\n- Leave used towels in the bathroom\n- Close the windows and lock the door\n- [Leave the keys in the lockbox]\n\nThank you for staying with us — safe travels!",
  },
  {
    id: "appliances",
    type: "appliances",
    title: "The comforts of home",
    icon: "coffee",
    description: "How-tos for appliances and features",
    body: "**Coffee:** [How the coffee machine works, where the capsules/beans are.]\n\n**Heating / AC:** [How to use the controls, a comfortable setting.]\n\n**Kitchen & laundry:** [Dishwasher, washer, anything with a knack to it.]",
  },
  {
    id: "local",
    type: "local",
    title: "Live like a local",
    icon: "map",
    description: "Local recommendations and favorite spots",
    body: "**Our favourite nearby spots:**\n- Coffee: [a place you love]\n- Dinner: [somewhere special]\n- A walk or a view: [where you'd send a friend]\n\nAsk us any time for a personal recommendation.",
  },
];

const iconComponents: Record<string, typeof Coffee> = {
  book: Coffee,
  key: Key,
  wifi: Wifi,
  heart: Heart,
  coffee: Coffee,
  sun: Sun,
  map: MapPin,
};

export function TemplateLibrary({
  existingSectionTypes,
  onInsert,
  close,
}: {
  existingSectionTypes: string[];
  onInsert: (section: Section) => void;
  close: () => void;
}) {
  const { tr } = useAppLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<(typeof sectionTemplates)[0] | null>(
    null,
  );

  const selected = preview || (selectedId ? sectionTemplates.find((t) => t.id === selectedId) : null);
  const alreadyAdded = (id: string) =>
    existingSectionTypes.includes(sectionTemplates.find((t) => t.id === id)?.type || "");

  function insertTemplate() {
    if (!selected) return;
    const templateIndex = sectionTemplates.findIndex((t) => t.id === selected.id);
    if (templateIndex === -1) return;

    const template = sectionTemplates[templateIndex];
    const newSection: Section = {
      id: crypto.randomUUID(),
      type: template.type,
      title: tr(template.title),
      body: template.body,
      icon: template.icon,
    };
    onInsert(newSection);
    close();
  }

  return (
    <Modal
      title={tr("Add a section from the library")}
      close={close}
      closeLabel={tr("Close dialog")}
    >
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        {tr(
          "Pick a pre-written section, customize it with your details, and add it to your guide.",
        )}
      </p>

      <div className="template-library-grid">
        {sectionTemplates.map((template) => {
          const Icon = iconComponents[template.icon] || Coffee;
          const isAdded = alreadyAdded(template.id);
          return (
            <button
              key={template.id}
              type="button"
              className={`template-library-card ${selectedId === template.id || preview?.id === template.id ? "active" : ""} ${isAdded ? "added" : ""}`}
              onClick={() => {
                setSelectedId(template.id);
                setPreview(null);
              }}
            >
              <span className="template-library-icon">
                <Icon size={18} />
              </span>
              <strong>{template.title}</strong>
              <small>{template.description}</small>
              {isAdded && (
                <span
                  className="template-library-badge"
                  title={tr("This section type is already in your guide")}
                >
                  <Check size={12} />
                  {tr("Added")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="template-library-preview">
          <div className="preview-header">
            <h3>{selected.title}</h3>
            <button
              type="button"
              className="icon-button"
              onClick={() => setPreview(null)}
              aria-label={tr("Close preview")}
            >
              <X size={16} />
            </button>
          </div>
          <div className="preview-content">
            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              {tr("Preview · customize after inserting")}
            </p>
            <div className="markdown" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <p>{selected.body.split("\n").slice(0, 4).join("\n")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="template-library-actions">
        <button
          type="button"
          className="button secondary"
          onClick={() => close()}
        >
          {tr("Cancel")}
        </button>
        <button
          type="button"
          className="button"
          disabled={!selected || alreadyAdded(selected.id)}
          onClick={insertTemplate}
        >
          <Plus size={15} />
          {alreadyAdded(selected?.id || "")
            ? tr("Already added")
            : tr("Insert section")}
        </button>
      </div>
    </Modal>
  );
}
