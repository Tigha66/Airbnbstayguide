"use client";
import { useState } from "react";
import { MapPin, Plus, X, Coffee, Utensils, Map as MapIcon, Compass } from "lucide-react";
import type { Recommendation } from "@stayguide/shared";

interface RecommendationEditorProps {
  recommendations: Recommendation[];
  onUpdate: (recommendations: Recommendation[]) => void;
  propertyLocation: string;
}

export function RecommendationEditor({
  recommendations,
  onUpdate,
  propertyLocation,
}: RecommendationEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Partial<Recommendation>>({});

  const typeIcons = {
    restaurant: <Utensils size={14} />,
    cafe: <Coffee size={14} />,
    attraction: <MapIcon size={14} />,
    activity: <Compass size={14} />,
  };

  function handleAdd() {
    if (form.title && form.address && form.type) {
      const newRec: Recommendation = {
        id: crypto.randomUUID(),
        title: form.title,
        type: form.type,
        address: form.address,
        description: form.description || "",
        lat: 0, // Would be geocoded in real app
        lng: 0,
      };
      onUpdate([...recommendations, newRec]);
      setForm({});
      setIsAdding(false);
    }
  }

  return (
    <div className="recommendation-editor">
      <h3>
        <MapPin size={16} />
        Local recommendations
      </h3>
      <p className="muted">
        Add restaurants, cafes, attractions and activities for your guests.
      </p>

      {recommendations.length > 0 && (
        <div className="recommendations-list">
          {recommendations.map((rec) => (
            <div key={rec.id} className="recommendation-item">
              <span className="rec-type">{typeIcons[rec.type]}</span>
              <div>
                <strong>{rec.title}</strong>
                <small>{rec.address}</small>
                {rec.description && <p>{rec.description}</p>}
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => onUpdate(recommendations.filter((r) => r.id !== rec.id))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="recommendation-form">
          <label>
            Title
            <input
              type="text"
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Casa do Bacalhoada"
              maxLength={120}
            />
          </label>
          <label>
            Type
            <select
              value={form.type || ""}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            >
              <option value="">Select a type</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Café</option>
              <option value="attraction">Attraction</option>
              <option value="activity">Activity</option>
            </select>
          </label>
          <label>
            Address
            <input
              type="text"
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street address"
              maxLength={200}
            />
          </label>
          <label>
            Description (optional)
            <textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Why you love this place"
              maxLength={500}
              rows={3}
            />
          </label>
          <div className="form-actions">
            <button className="button" type="button" onClick={handleAdd}>
              Add recommendation
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setIsAdding(false);
                setForm({});
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="button secondary"
          type="button"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={14} />
          Add recommendation
        </button>
      )}
    </div>
  );
}
