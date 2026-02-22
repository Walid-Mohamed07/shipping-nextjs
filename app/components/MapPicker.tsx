"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapPickerProps {
  onSelect: (lat: number, lon: number, address: any) => void;
}

export default function MapPicker({ onSelect }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([30.0444, 31.2357], 10); // Default to Cairo

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Map click handler
    mapInstance.current.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      setIsLoading(true);
      try {
        // Remove old marker
        if (markerRef.current) {
          mapInstance.current?.removeLayer(markerRef.current);
        }

        // Add new marker
        markerRef.current = L.marker([lat, lng])
          .addTo(mapInstance.current!)
          .bindPopup("Selected Location")
          .openPopup();

        // Reverse geocode using Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            headers: {
              "User-Agent": "ShipHub/1.0",
            },
          },
        );

        const data = await response.json();

        onSelect(lat, lng, {
          country: data.address?.country || "",
          city:
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            "",
          street: data.address?.road || "",
          postcode: data.address?.postcode || "",
          full_address: data.display_name || "",
        });
      } catch (error) {
        console.error("Geocoding error:", error);
        onSelect(lat, lng, {});
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, [onSelect]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full bg-gray-100"
      style={{ minHeight: "240px" }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white px-4 py-2 rounded-lg">Loading...</div>
        </div>
      )}
    </div>
  );
}
