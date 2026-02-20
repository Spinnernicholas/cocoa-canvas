/**
 * React Leaflet Map Component
 * Displays households and parcels on an interactive map
 */

'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface Household {
  id: string;
  streetName?: string;
  houseNumber?: string;
  streetSuffix?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  personCount: number;
}

interface MapComponentProps {
  households: Household[];
  onBoundsChange: (bounds: Bounds) => void;
}

// Fix Leaflet default icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.setIcon(DefaultIcon);

export default function Map({ households, onBoundsChange }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([37.7749, -122.4194], 12); // Default to SF

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add marker layer group
    markersRef.current.addTo(map);

    // Track bounds
    const handleBoundsChange = () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    map.on('moveend', handleBoundsChange);
    map.on('zoomend', handleBoundsChange);

    // Trigger initial bounds
    handleBoundsChange();

    mapRef.current = map;

    return () => {
      map.off('moveend', handleBoundsChange);
      map.off('zoomend', handleBoundsChange);
    };
  }, [onBoundsChange]);

  // Update markers when households change
  useEffect(() => {
    if (!markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Add new markers
    for (const household of households) {
      // Skip households without valid coordinates
      if (!household.latitude || !household.longitude) {
        continue;
      }

      if (household.latitude === 0 && household.longitude === 0) {
        continue; // Skip null island
      }

      const marker = L.marker([household.latitude, household.longitude], {
        icon: DefaultIcon,
      });

      // Create popup content
      const popupContent = `
        <div class="font-sans p-2">
          <p class="font-semibold text-sm">${household.fullAddress}</p>
          <p class="text-xs text-gray-600">${household.city}, ${household.state} ${household.zipCode}</p>
          <p class="text-xs text-gray-500 mt-1">${household.personCount} person${household.personCount !== 1 ? 's' : ''}</p>
          <a href="/households/${household.id}" class="text-xs text-blue-600 hover:underline mt-2 inline-block">View details →</a>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.addLayer(marker);
    }
  }, [households]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '100%' }}
    />
  );
}
