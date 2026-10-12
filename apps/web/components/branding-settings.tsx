"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import type { WorkspaceBranding } from "@stayguide/shared";

interface BrandingSettingsProps {
  branding: WorkspaceBranding;
  onUpdate: (branding: WorkspaceBranding) => void;
}

export function BrandingSettings({ branding, onUpdate }: BrandingSettingsProps) {
  const [colors, setColors] = useState(branding);

  function handleColorChange(field: keyof WorkspaceBranding, value: string) {
    const updated = { ...colors, [field]: value };
    setColors(updated);
    onUpdate(updated);
  }

  return (
    <div className="branding-settings">
      <div className="settings-header">
        <Palette size={20} />
        <h3>Brand colors</h3>
      </div>

      <label>
        Primary color
        <div className="color-input-group">
          <input
            type="color"
            value={colors.primaryColor}
            onChange={(e) => handleColorChange("primaryColor", e.target.value)}
          />
          <input
            type="text"
            value={colors.primaryColor}
            onChange={(e) => handleColorChange("primaryColor", e.target.value)}
            maxLength={7}
            placeholder="#000000"
          />
        </div>
      </label>

      <label>
        Accent color
        <div className="color-input-group">
          <input
            type="color"
            value={colors.accentColor}
            onChange={(e) => handleColorChange("accentColor", e.target.value)}
          />
          <input
            type="text"
            value={colors.accentColor}
            onChange={(e) => handleColorChange("accentColor", e.target.value)}
            maxLength={7}
            placeholder="#000000"
          />
        </div>
      </label>

      {colors.logoUrl && (
        <div className="logo-preview">
          <p className="label">Logo preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={colors.logoUrl} alt="Workspace logo" />
        </div>
      )}

      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Colors are applied to your editor and guest guides. Changes appear immediately.
      </p>
    </div>
  );
}
