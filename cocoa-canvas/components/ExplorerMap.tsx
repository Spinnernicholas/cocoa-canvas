'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Feature {
  type: 'Feature';
  geometry: any;
  properties: Record<string, any>;
}

interface Extent {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  spatialReference?: {
    wkid: number;
  };
}

interface ExplorerMapProps {
  featuresByLayer: Map<string, Feature[]>;
  layerServiceMap: Map<string, string>;
  extent?: Extent;
  zoomToLayerId?: string;
  onFeaturesLoad?: (layerId: string, features: Feature[]) => void;
  onZoomComplete?: (layerId: string) => void;
}

export default function ExplorerMap({
  featuresByLayer,
  layerServiceMap,
  extent,
  zoomToLayerId,
  onFeaturesLoad,
  onZoomComplete,
}: ExplorerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayersRef = useRef<Map<string, L.GeoJSON>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Calculate initial view based on extent
    let initialLat = 37.7749;
    let initialLng = -122.4194;
    let initialZoom = 12;

    if (extent && extent.xmin !== undefined && extent.ymin !== undefined) {
      // Use extent center as initial view
      initialLng = (extent.xmin + extent.xmax) / 2;
      initialLat = (extent.ymin + extent.ymax) / 2;
      // Use a high zoom level initially; will fit bounds when features load
      initialZoom = 13;
    }

    const map = L.map(containerRef.current).setView([initialLat, initialLng], initialZoom);

    // Add OSM base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [extent]);

  // Set up map interaction listeners to fetch features for visible area
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapChange = async () => {
      if (!mapRef.current) return;

      const bounds = mapRef.current.getBounds();
      const bbox = {
        xmin: bounds.getWest(),
        ymin: bounds.getSouth(),
        xmax: bounds.getEast(),
        ymax: bounds.getNorth(),
      };

      // Fetch features directly from ESRI services as GeoJSON
      for (const [layerId, serviceUrl] of layerServiceMap) {
        try {
          const esriQuery = new URLSearchParams({
            where: '1=1',
            geometryType: 'esriGeometryEnvelope',
            geometry: JSON.stringify({
              xmin: bbox.xmin,
              ymin: bbox.ymin,
              xmax: bbox.xmax,
              ymax: bbox.ymax,
              spatialRef: { wkid: 4326 },
            }),
            inSR: '4326',
            outSR: '4326',
            outFields: '*',
            returnGeometry: 'true',
            f: 'geojson',
          });

          const url = `${serviceUrl}/${layerId}/query?${esriQuery.toString()}`;
          const response = await fetch(url);
          
          if (!response.ok) continue;

          const geoJsonData = await response.json();
          if (!geoJsonData.features || geoJsonData.features.length === 0) continue;

          onFeaturesLoad?.(layerId, geoJsonData.features);
        } catch (err) {
          console.error(`Error fetching features from ${serviceUrl}:`, err);
        }
      }
    };

    // Debounce to avoid too many requests while panning
    let timeoutId: NodeJS.Timeout;
    const debouncedHandleMapChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleMapChange, 500);
    };

    // Listen to map move/zoom events
    mapRef.current.on('moveend', debouncedHandleMapChange);
    mapRef.current.on('zoomend', debouncedHandleMapChange);

    return () => {
      clearTimeout(timeoutId);
      if (mapRef.current) {
        mapRef.current.off('moveend', debouncedHandleMapChange);
        mapRef.current.off('zoomend', debouncedHandleMapChange);
      }
    };
  }, [layerServiceMap, onFeaturesLoad]);

  // Fetch features when new layers are added
  useEffect(() => {
    if (!mapRef.current || layerServiceMap.size === 0) return;

    const bounds = mapRef.current.getBounds();
    const bbox = {
      xmin: bounds.getWest(),
      ymin: bounds.getSouth(),
      xmax: bounds.getEast(),
      ymax: bounds.getNorth(),
    };

    // Fetch features for all layers
    const fetchAllLayers = async () => {
      for (const [layerId, serviceUrl] of layerServiceMap) {
        try {
          const esriQuery = new URLSearchParams({
            where: '1=1',
            geometryType: 'esriGeometryEnvelope',
            geometry: JSON.stringify({
              xmin: bbox.xmin,
              ymin: bbox.ymin,
              xmax: bbox.xmax,
              ymax: bbox.ymax,
              spatialRef: { wkid: 4326 },
            }),
            inSR: '4326',
            outSR: '4326',
            outFields: '*',
            returnGeometry: 'true',
            f: 'geojson',
          });

          const url = `${serviceUrl}/${layerId}/query?${esriQuery.toString()}`;
          const response = await fetch(url);
          
          if (!response.ok) continue;

          const geoJsonData = await response.json();
          if (!geoJsonData.features || geoJsonData.features.length === 0) continue;

          onFeaturesLoad?.(layerId, geoJsonData.features);
        } catch (err) {
          console.error(`Error fetching features from ${serviceUrl}:`, err);
        }
      }
    };

    fetchAllLayers();
  }, [layerServiceMap, onFeaturesLoad]);

  // Validate and clean coordinates recursively
  const cleanCoordinates = (coords: any): any => {
    if (!Array.isArray(coords)) return null;

    // For a single coordinate [lng, lat]
    if (typeof coords[0] === 'number') {
      if (coords.length >= 2 && isFinite(coords[0]) && isFinite(coords[1])) {
        return [coords[0], coords[1]];
      }
      return null;
    }

    // For nested arrays (rings, paths, etc.)
    return coords
      .map((coord: any) => cleanCoordinates(coord))
      .filter((c: any) => c !== null);
  };

  // Validate GeoJSON geometry
  const isValidGeometry = (geometry: any): boolean => {
    if (!geometry || !geometry.type) return false;

    const type = geometry.type;
    const coords = geometry.coordinates;

    if (!coords) return false;

    // Check for empty or invalid coordinate arrays
    if (Array.isArray(coords) && coords.length === 0) return false;

    // Validate based on geometry type
    if (type === 'Point') {
      return (
        Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === 'number' &&
        typeof coords[1] === 'number' &&
        isFinite(coords[0]) &&
        isFinite(coords[1])
      );
    } else if (type === 'LineString' || type === 'MultiPoint') {
      return (
        Array.isArray(coords) &&
        coords.length > 0 &&
        coords.every(
          (c: any) =>
            Array.isArray(c) &&
            c.length >= 2 &&
            typeof c[0] === 'number' &&
            typeof c[1] === 'number' &&
            isFinite(c[0]) &&
            isFinite(c[1])
        )
      );
    } else if (type === 'Polygon' || type === 'MultiLineString') {
      return (
        Array.isArray(coords) &&
        coords.length > 0 &&
        coords.every(
          (ring: any) =>
            Array.isArray(ring) &&
            ring.length > 0 &&
            ring.every(
              (c: any) =>
                Array.isArray(c) &&
                c.length >= 2 &&
                typeof c[0] === 'number' &&
                typeof c[1] === 'number' &&
                isFinite(c[0]) &&
                isFinite(c[1])
            )
        )
      );
    } else if (type === 'MultiPolygon') {
      return (
        Array.isArray(coords) &&
        coords.length > 0 &&
        coords.every(
          (polygon: any) =>
            Array.isArray(polygon) &&
            polygon.length > 0 &&
            polygon.every(
              (ring: any) =>
                Array.isArray(ring) &&
                ring.length > 0 &&
                ring.every(
                  (c: any) =>
                    Array.isArray(c) &&
                    c.length >= 2 &&
                    typeof c[0] === 'number' &&
                    typeof c[1] === 'number' &&
                    isFinite(c[0]) &&
                    isFinite(c[1])
                )
            )
        )
      );
    }

    return true;
  };

  // Generate color for layer based on ID
  const getLayerColor = (layerId: string, index: number): string => {
    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
    ];
    return colors[index % colors.length];
  };

  // Update features on map
  useEffect(() => {
    if (!mapRef.current) return;

    // Track which layers have features
    const layersWithFeatures = new Set(featuresByLayer.keys());
    const currentLayers = geoJsonLayersRef.current;

    // Remove layers that are no longer selected
    for (const [layerId, layer] of currentLayers) {
      if (!layersWithFeatures.has(layerId)) {
        mapRef.current.removeLayer(layer);
        currentLayers.delete(layerId);
      }
    }

    // If no layers have features, clear everything
    if (layersWithFeatures.size === 0) {
      return;
    }

    // Add or update layers
    let layerIndex = 0;
    let allBounds: L.LatLngBounds | null = null;

    for (const [layerId, features] of featuresByLayer) {
      if (features.length === 0) continue;

      // Filter and validate features
      const validFeatures = features.filter((f) => {
        if (!f || !f.geometry) return false;
        if (!isValidGeometry(f.geometry)) return false;

        if (f.geometry.type === 'Point') {
          const coords = f.geometry.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) return false;
          if (coords[0] == null || coords[1] == null) return false;
          if (typeof coords[0] !== 'number' || typeof coords[1] !== 'number') return false;
          if (!isFinite(coords[0]) || !isFinite(coords[1])) return false;
        }

        return true;
      });

      if (validFeatures.length === 0) continue;

      // Create sanitized feature collection
      const sanitizedFeatures = validFeatures.map((feature) => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: cleanCoordinates(feature.geometry.coordinates),
        },
      }));

      const featureCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: sanitizedFeatures,
      };

      const layerColor = getLayerColor(layerId, layerIndex);

      try {
        // Remove old layer if it exists
        if (currentLayers.has(layerId)) {
          mapRef.current.removeLayer(currentLayers.get(layerId)!);
        }

        // Create new GeoJSON layer
        const geoJsonLayer = L.geoJSON(featureCollection, {
          style: (feature) => {
            const geomType = feature?.geometry?.type;

            switch (geomType) {
              case 'Point':
              case 'MultiPoint':
                return {};
              case 'Polygon':
              case 'MultiPolygon':
                return {
                  fillColor: layerColor,
                  weight: 2,
                  opacity: 0.8,
                  color: layerColor,
                  fillOpacity: 0.3,
                };
              case 'LineString':
              case 'MultiLineString':
                return {
                  weight: 3,
                  opacity: 0.8,
                  color: layerColor,
                };
              default:
                return {
                  fillColor: layerColor,
                  weight: 2,
                  opacity: 0.8,
                  color: layerColor,
                  fillOpacity: 0.3,
                };
            }
          },
          pointToLayer: (_feature, latlng) => {
            if (!latlng || typeof latlng.lat !== 'number' || typeof latlng.lng !== 'number' || !isFinite(latlng.lat) || !isFinite(latlng.lng)) {
              return L.circleMarker([0, 0], {
                radius: 0,
                fillOpacity: 0,
                opacity: 0,
              });
            }
            return L.circleMarker(latlng, {
              radius: 5,
              fillColor: layerColor,
              color: layerColor,
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.7,
            });
          },
          onEachFeature: (_feature, layer) => {
            const props = _feature.properties || {};
            const popupContent = Object.entries(props)
              .map(([key, value]) => {
                const displayValue = value !== null && value !== undefined ? String(value).substring(0, 50) : 'N/A';
                return `<strong>${key}:</strong> ${displayValue}`;
              })
              .join('<br />');

            if (popupContent) {
              layer.bindPopup(popupContent);
            }
          },
        }).addTo(mapRef.current);

        currentLayers.set(layerId, geoJsonLayer);

        // Accumulate bounds from all layers
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          allBounds = allBounds ? allBounds.extend(bounds) : bounds;
        }
      } catch (err) {
        console.error(`Error rendering layer ${layerId}:`, err);
      }

      layerIndex++;
    }
  }, [featuresByLayer]);

  // Zoom to map extent when extent prop is available
  useEffect(() => {
    if (!mapRef.current) return;

    // Zoom to the extent prop if available
    if (extent && extent.xmin !== undefined && extent.ymin !== undefined && extent.xmax !== undefined && extent.ymax !== undefined) {
      const bounds = L.latLngBounds(
        L.latLng(extent.ymin, extent.xmin),
        L.latLng(extent.ymax, extent.xmax)
      );
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [extent]);

  // Zoom to a specific layer when requested
  useEffect(() => {
    if (!mapRef.current || !zoomToLayerId) return;

    const layer = geoJsonLayersRef.current.get(zoomToLayerId);
    if (layer) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        // Notify parent that zoom is complete so it can clear the state
        onZoomComplete?.(zoomToLayerId);
      }
    }
  }, [zoomToLayerId, onZoomComplete]);

  // Zoom to extent of all selected layers
  const zoomToExtent = () => {
    if (!mapRef.current) return;

    let allBounds: L.LatLngBounds | null = null;
    for (const layer of geoJsonLayersRef.current.values()) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        allBounds = allBounds ? allBounds.extend(bounds) : bounds;
      }
    }

    if (allBounds && allBounds.isValid()) {
      mapRef.current.fitBounds(allBounds, { padding: [50, 50] });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-cocoa-800 rounded-lg border border-cocoa-200 dark:border-cocoa-700 overflow-hidden">
      {/* Map Header */}
      <div className="bg-cocoa-50 dark:bg-cocoa-700 px-4 py-3 border-b border-cocoa-200 dark:border-cocoa-600">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-semibold text-cocoa-900 dark:text-white flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              Layers ({featuresByLayer.size} selected)
            </h3>
            <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1">
              {[...featuresByLayer.values()].reduce((sum, features) => sum + features.length, 0)} total features
            </p>
          </div>
          <button
            onClick={zoomToExtent}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-cocoa-200 dark:bg-cocoa-600 hover:bg-cocoa-300 dark:hover:bg-cocoa-500 text-cocoa-900 dark:text-white transition-colors"
            title="Zoom to layers extent"
          >
            🔍
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-gradient-to-b from-blue-50 to-blue-100 dark:from-cocoa-700 dark:to-cocoa-800"
        style={{ minHeight: '400px' }}
      />

      {/* Map Footer */}
      <div className="bg-cocoa-50 dark:bg-cocoa-700 px-4 py-2 text-xs text-cocoa-600 dark:text-cocoa-300 border-t border-cocoa-200 dark:border-cocoa-600">
        © OpenStreetMap contributors | Click features for details
      </div>
    </div>
  );
}
