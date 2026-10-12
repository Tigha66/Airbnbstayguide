"use client";
import { useState, useEffect } from "react";
import { MapPin, Search, Plus, X } from "lucide-react";
import type { Recommendation } from "@stayguide/shared";

interface LocalRecommendationsProps {
  recommendations?: Recommendation[];
  onAddRecommendation?: (rec: Recommendation) => void;
  onDeleteRecommendation?: (id: string) => void;
  editable?: boolean;
  propertyLocation: string;
}

export function LocalRecommendations({
  recommendations = [],
  onAddRecommendation,
  onDeleteRecommendation,
  editable = false,
  propertyLocation,
}: LocalRecommendationsProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "restaurant" as const,
    address: "",
    description: "",
  });

  // Load Google Maps script
  useEffect(() => {
    if (mapLoaded) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, [mapLoaded]);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !window.google) return;

    const mapElement = document.getElementById("local-recommendations-map");
    if (!mapElement) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: propertyLocation }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const location = results[0].geometry.location;
        const newMap = new google.maps.Map(mapElement, {
          zoom: 15,
          center: location,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        setMap(newMap);
      }
    });
  }, [mapLoaded, propertyLocation]);

  // Update markers when recommendations change
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing markers
    markers.forEach((m) => m.setMap(null));

    const iconUrl = (type: string) => {
      const colors: Record<string, string> = {
        restaurant: "FF6B6B",
        cafe: "4ECDC4",
        attraction: "FFD93D",
        activity: "6BCB77",
      };
      return `https://maps.google.com/mapfiles/ms/micons/${colors[type] || "FF0000"}-dot.png`;
    };

    const newMarkers = recommendations.map((rec) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: rec.lat, lng: rec.lng },
        title: rec.title,
        icon: iconUrl(rec.type),
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px; font-size: 12px;">
          <strong>${rec.title}</strong><br/>
          ${rec.address}<br/>
          <em>${rec.type}</em>
        </div>`,
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      return marker;
    });

    setMarkers(newMarkers);
  }, [map, recommendations]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || !window.google) return;

    const service = new google.maps.places.PlacesService(map!);
    service.findPlaceFromQuery(
      { query: searchInput, fields: ["geometry", "formatted_address", "name", "type"] },
      (results, status) => {
        if (status === "OK" && results?.[0]) {
          const place = results[0];
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setFormData({
              ...formData,
              address: place.formatted_address || searchInput,
              title: place.name || searchInput,
            });
            map?.setCenter({ lat, lng });
          }
        }
      }
    );
  };

  const handleAddRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.address.trim() || !map) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: formData.address }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const location = results[0].geometry.location;
        const newRec: Recommendation = {
          id: `rec-${Date.now()}`,
          title: formData.title,
          type: formData.type,
          address: formData.address,
          lat: location.lat(),
          lng: location.lng(),
          description: formData.description,
        };
        onAddRecommendation?.(newRec);
        setFormData({ title: "", type: "restaurant", address: "", description: "" });
        setSearchInput("");
        setShowForm(false);
      }
    });
  };

  return (
    <div className="local-recommendations">
      <div id="local-recommendations-map" style={{ width: "100%", height: "300px", marginBottom: "16px", borderRadius: "8px" }} />

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search nearby places..."
            style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid var(--muted)" }}
          />
          <button type="submit" className="button small">
            <Search size={14} />
          </button>
        </form>
        {editable && (
          <button
            className="button small"
            onClick={() => setShowForm(!showForm)}
            type="button"
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>

      {editable && showForm && (
        <form
          onSubmit={handleAddRecommendation}
          style={{
            padding: "12px",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <label style={{ display: "block", marginBottom: "8px" }}>
            Name
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={120}
            />
          </label>
          <label style={{ display: "block", marginBottom: "8px" }}>
            Type
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as Recommendation["type"],
                })
              }
            >
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Cafe</option>
              <option value="attraction">Attraction</option>
              <option value="activity">Activity</option>
            </select>
          </label>
          <label style={{ display: "block", marginBottom: "8px" }}>
            Address
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              maxLength={300}
            />
          </label>
          <label style={{ display: "block", marginBottom: "12px" }}>
            Description
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
              rows={3}
              placeholder="Optional: add details about this place"
            />
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="button small">
              Add Recommendation
            </button>
            <button
              type="button"
              className="button small secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {recommendations.length > 0 && (
        <div>
          <h4 style={{ marginBottom: "12px" }}>Local Gems ({recommendations.length})</h4>
          <div style={{ display: "grid", gap: "8px" }}>
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                style={{
                  padding: "12px",
                  background: "var(--bg-secondary)",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <MapPin size={14} />
                    <strong>{rec.title}</strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "capitalize" }}>
                      {rec.type}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0" }}>
                    {rec.address}
                  </p>
                  {rec.description && (
                    <p style={{ fontSize: "12px", margin: "4px 0" }}>{rec.description}</p>
                  )}
                </div>
                {editable && (
                  <button
                    type="button"
                    onClick={() => onDeleteRecommendation?.(rec.id)}
                    style={{ padding: "4px", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
