'use client';

import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Feature {
  type: 'Feature';
  geometry: any;
  properties: Record<string, any>;
}

interface ArcGISMapProps {
  layerUrls?: Record<string, string>;
  selectedLayerIds?: Set<string>;
  layerOpacity?: Record<string, number>;
  layerVisibility?: Record<string, boolean>;
  onLayersLoad?: (layers: Array<{ id: string; name: string }>) => void;
  onExtentChange?: (extent: any) => void;
}

export default function ArcGISMap({
  layerUrls = {},
  selectedLayerIds = new Set(),
  layerOpacity = {},
  layerVisibility = {},
  onLayersLoad,
  onExtentChange,
}: ArcGISMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayersRef = useRef<Map<string, L.GeoJSON>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current).setView([37.7749, -122.4194], 4);

    // Add ArcGIS basemap variant (using USGS tiles)
    L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© ArcGIS, USGS',
      maxZoom: 16,
    }).addTo(map);

    mapRef.current = map;

    // Listen for extent changes
    map.on('moveend', () => {
      const bounds = map.getBounds();
      onExtentChange?.({
        xmin: bounds.getWest(),
        ymin: bounds.getSouth(),
        xmax: bounds.getEast(),
        ymax: bounds.getNorth(),
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onExtentChange]);

  // Fetch GeoJSON from ArcGIS service
  const fetchGeoJSON = useCallback(async (url: string, layerId: string) => {
    try {
      const params = new URLSearchParams({
        where: '1=1',
        outFields: '*',
        returnGeometry: 'true',
        f: 'geojson',
      });

      // Use proxy to avoid CORS issues
      const proxyUrl = `/api/v1/arcgis/proxy?url=${encodeURIComponent(`${url}/query?${params.toString()}`)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;

      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`Error fetching GeoJSON from ${url}:`, err);
      return null;
    }
  }, []);

  // Update layers
  useEffect(() => {
    if (!mapRef.current) return;

    const loadedLayerIds = new Set(geoJsonLayersRef.current.keys());
    const selectedIds = selectedLayerIds || new Set();

    // Remove layers that are no longer selected
    for (const layerId of loadedLayerIds) {
      if (!selectedIds.has(layerId)) {
        const layer = geoJsonLayersRef.current.get(layerId);
        if (layer) {
          mapRef.current.removeLayer(layer);
          geoJsonLayersRef.current.delete(layerId);
        }
      }
    }

    // Add or update selected layers
    const urlsObj = layerUrls || {};
    const urlEntries = Object.entries(urlsObj);
    if (urlEntries.length === 0) return;

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    let colorIndex = 0;
    for (const [layerId, url] of urlEntries) {
      if (!selectedIds.has(layerId)) continue;

      const existingLayer = geoJsonLayersRef.current.get(layerId);
      const isVisible = layerVisibility?.[layerId] !== false;
      const opacity = layerOpacity?.[layerId] ?? 1;

      if (existingLayer) {
        // Update existing layer
        existingLayer.setStyle({
          opacity: opacity,
          fillOpacity: opacity * 0.5,
        });
        existingLayer.eachLayer((layer: any) => {
          if (layer.setOpacity) layer.setOpacity(opacity);
          if (layer.setStyle) layer.setStyle({ opacity, fillOpacity: opacity * 0.5 });
        });

        if (mapRef.current) {
          if (isVisible && !mapRef.current.hasLayer(existingLayer)) {
            mapRef.current.addLayer(existingLayer);
          } else if (!isVisible && mapRef.current.hasLayer(existingLayer)) {
            mapRef.current.removeLayer(existingLayer);
          }
        }
        continue;
      }

      // Fetch and load new layer
      (async () => {
        try {
          const geoJsonData = await fetchGeoJSON(url, layerId);
          if (!geoJsonData || !geoJsonData.features) return;

          const color = colors[colorIndex % colors.length];
          colorIndex++;

          const geoJsonLayer = L.geoJSON(geoJsonData, {
            style: {
              color: color,
              weight: 2,
              opacity: opacity,
              fillOpacity: opacity * 0.5,
              fillColor: color,
            },
            pointToLayer: (_feature, latlng) => {
              return L.circleMarker(latlng, {
                radius: 5,
                fillColor: color,
                color: color,
                weight: 2,
                opacity: opacity,
                fillOpacity: opacity * 0.7,
              });
            },
            onEachFeature: (_feature, layer) => {
              const props = _feature.properties || {};
              const popupContent = Object.entries(props)
                .slice(0, 10)
                .map(([key, value]) => {
                  const displayValue =
                    value !== null && value !== undefined
                      ? String(value).substring(0, 100)
                      : 'N/A';
                  return `<strong>${key}:</strong> ${displayValue}`;
                })
                .join('<br />');

              if (popupContent) {
                layer.bindPopup(popupContent);
              }
            },
          });

          if (mapRef.current && isVisible) {
            geoJsonLayer.addTo(mapRef.current);
          }

          geoJsonLayersRef.current.set(layerId, geoJsonLayer);

          // Notify that layer loaded
          onLayersLoad?.([
            {
              id: layerId,
              name: layerId,
            },
          ]);
        } catch (err) {
          console.error(`Error loading layer ${layerId}:`, err);
        }
      })();
    }
  }, [layerUrls, selectedLayerIds, layerOpacity, layerVisibility, fetchGeoJSON, onLayersLoad]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full rounded-lg overflow-hidden border border-cocoa-200 dark:border-cocoa-700"
      style={{ minHeight: '500px' }}
    />
  );
}
