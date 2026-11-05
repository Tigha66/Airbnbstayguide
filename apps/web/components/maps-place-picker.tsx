"use client";
import { useState, useRef, useEffect } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import type { LocationPoint } from "@stayguide/shared";

interface MapsPlacePickerProps {
  location: LocationPoint | undefined;
  onSelect: (location: LocationPoint) => void;
  onClear: () => void;
  tr: (key: string, params?: Record<string, any>) => string;
}

export function MapsPlacePicker({
  location,
  onSelect,
  onClear,
  tr,
}: MapsPlacePickerProps) {
  const [searchQuery, setSearchQuery] = useState(location?.address || "");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    id: string;
    address: string;
    lat: number;
    lng: number;
  }>>([]);
  const [showMap, setShowMap] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // In production, this would call the real geocoding API
  // For demo, use static suggestions
  function mockSearch(query: string) {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    setTimeout(() => {
      const mockResults = [
        {
          id: "1",
          address: query + ", Lisbon, Portugal",
          lat: 38.7223,
          lng: -9.1393,
        },
        {
          id: "2",
          address: query + ", Algarve, Portugal",
          lat: 37.0874,
          lng: -8.6753,
        },
        {
          id: "3",
          address: query + ", Barcelona, Spain",
          lat: 41.3874,
          lng: 2.1686,
        },
      ];
      setSuggestions(mockResults);
      setSearching(false);
    }, 300);
  }

  useEffect(() => {
    searchTimeoutRef.current = setTimeout(() => {
      mockSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  return (
    <div className="maps-picker">
      <div className="picker-header">
        <h4>{tr("Property location")}</h4>
        {location && (
          <button
            type="button"
            onClick={onClear}
            className="icon-button"
            aria-label={tr("Clear location")}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="search-field">
        <MapPin size={16} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={tr("Search address or place name…")}
        />
        {searching && <Loader2 size={16} className="animate-spin" />}
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions-list">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => {
                onSelect({
                  latitude: suggestion.lat,
                  longitude: suggestion.lng,
                  address: suggestion.address,
                });
                setSuggestions([]);
              }}
              className="suggestion-item"
            >
              <MapPin size={14} />
              <div>
                <strong>{suggestion.address.split(",")[0]}</strong>
                <small>{suggestion.address}</small>
              </div>
            </button>
          ))}
        </div>
      )}

      {location && (
        <div className="location-preview">
          <div className="preview-info">
            <strong>{location.address}</strong>
            <small>
              {tr("Latitude: {lat}, Longitude: {lng}", {
                lat: location.latitude.toFixed(4),
                lng: location.longitude.toFixed(4),
              })}
            </small>
          </div>
          <div className="map-placeholder">
            <p>{tr("Map preview")}</p>
            <p className="coords">
              📍 {location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMap(!showMap)}
        className="button secondary small"
        style={{ marginTop: 12 }}
      >
        {showMap ? tr("Hide map") : tr("Show on map")}
      </button>
    </div>
  );
}
