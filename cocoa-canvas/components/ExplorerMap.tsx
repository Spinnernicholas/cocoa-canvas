'use client';

import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import proj4 from 'proj4';
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
  onFeatureLimitExceeded?: (layerId: string, limitReached: boolean) => void;
  layerOpacity?: Map<string, number>;
  layerVisibility?: Map<string, boolean>;
}

const STATE_PLANE_CA_ZONE_3 = '+proj=lcc +lat_1=37.06666666666667 +lat_2=38.43333333333333 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000 +y_0=500000.0000000001 +datum=NAD83 +units=ft +no_defs';

proj4.defs('EPSG:2227', STATE_PLANE_CA_ZONE_3);
proj4.defs('ESRI:102643', STATE_PLANE_CA_ZONE_3);

// Feature limits for performance management
const FETCH_BATCH_SIZE = 1000; // Features per request (typical ArcGIS limit)
const MAX_FEATURES_TO_DISPLAY = 10000; // Maximum features to stream and display

export default function ExplorerMap({
  featuresByLayer,
  layerServiceMap,
  extent,
  zoomToLayerId,
  onFeaturesLoad,
  onZoomComplete,
  onFeatureLimitExceeded,
  layerOpacity,
  layerVisibility,
}: ExplorerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayersRef = useRef<Map<string, L.GeoJSON>>(new Map());
  const projDefCacheRef = useRef<Map<number, string>>(new Map());
  const layerRequestControllersRef = useRef<Map<string, AbortController>>(new Map());

  const abortLayerRequest = (layerId: string) => {
    const existing = layerRequestControllersRef.current.get(layerId);
    if (existing) {
      existing.abort();
      layerRequestControllersRef.current.delete(layerId);
    }
  };

  const createLayerRequestController = (layerId: string) => {
    abortLayerRequest(layerId);
    const controller = new AbortController();
    layerRequestControllersRef.current.set(layerId, controller);
    return controller;
  };

  const shouldAssumeWebMercator = (x: number, y: number, wkid?: number): boolean => {
    if (wkid === 102100 || wkid === 102113 || wkid === 3857) return true;
    // Heuristic: Web Mercator meters are far outside lon/lat degree ranges
    if (Math.abs(x) > 180 || Math.abs(y) > 90) return true;
    return false;
  };

  const getProj4Def = async (wkid?: number): Promise<string | null> => {
    if (!wkid) return null;

    const cache = projDefCacheRef.current;
    if (cache.has(wkid)) return cache.get(wkid) || null;

    const knownDefs: Record<number, string> = {
      4326: 'EPSG:4326',
      3857: 'EPSG:3857',
      102100: 'EPSG:3857',
      102113: 'EPSG:3857',
      2227: 'EPSG:2227',
      102643: 'ESRI:102643',
    };

    if (knownDefs[wkid]) {
      cache.set(wkid, knownDefs[wkid]);
      return knownDefs[wkid];
    }

    try {
      const response = await fetch(`https://epsg.io/${wkid}.proj4`);
      if (!response.ok) return null;
      const projText = (await response.text()).trim();
      if (!projText) return null;
      const projName = `EPSG:${wkid}`;
      proj4.defs(projName, projText);
      cache.set(wkid, projName);
      return projName;
    } catch (err) {
      console.warn('Failed to fetch projection definition for WKID', wkid, err);
      return null;
    }
  };

  const projectToLatLng = async (x: number, y: number, wkid?: number): Promise<[number, number]> => {
    const projName = await getProj4Def(wkid);
    if (projName && projName !== 'EPSG:4326') {
      try {
        const [lng, lat] = proj4(projName, 'EPSG:4326', [x, y]) as [number, number];
        return [lat, lng];
      } catch (err) {
        console.warn('Projection failed for WKID', wkid, err);
      }
    }

    if (shouldAssumeWebMercator(x, y, wkid)) {
      const lng = (x / 20037508.34) * 180;
      const lat = (y / 20037508.34) * 180;
      const latRad = (lat * Math.PI) / 180;
      const latDeg = (180 / Math.PI) * (2 * Math.atan(Math.exp(latRad)) - Math.PI / 2);
      return [latDeg, lng];
    }

    // Assume geographic coordinates (EPSG:4326) by default
    return [y, x];
  };

  const extentToBounds = async (inputExtent?: Extent): Promise<L.LatLngBounds | null> => {
    if (!inputExtent) return null;
    const { xmin, ymin, xmax, ymax, spatialReference } = inputExtent;
    if ([xmin, ymin, xmax, ymax].some((value) => value == null || !isFinite(value))) {
      return null;
    }

    const wkid = spatialReference?.wkid;
    const southwest = await projectToLatLng(xmin, ymin, wkid);
    const northeast = await projectToLatLng(xmax, ymax, wkid);
    return L.latLngBounds(southwest, northeast);
  };

  // Check feature count for a layer
  const checkFeatureCount = async (
    serviceUrl: string,
    layerId: string,
    bbox: { xmin: number; ymin: number; xmax: number; ymax: number }
  ): Promise<number | null> => {
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
        returnCountOnly: 'true',
        f: 'json',
      });

      const url = `${serviceUrl}/${layerId}/query?${esriQuery.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      const data = await response.json();
      return data.count !== undefined ? data.count : null;
    } catch (err) {
      console.error(`Error checking feature count for layer ${layerId}:`, err);
      return null;
    }
  };

  // Fetch features with pagination support - streams features as they arrive
  // Caps at MAX_FEATURES_TO_DISPLAY (10k) to prevent browser overload
  const fetchFeaturesWithPagination = async (
    serviceUrl: string,
    layerId: string,
    bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
    maxFeatures: number,
    signal: AbortSignal,
    onBatchReceived: (features: any[], totalSoFar: number, limitExceeded: boolean) => void
  ): Promise<number> => {
    let totalFetched = 0;
    let offset = 0;
    const fetchLimit = Math.min(maxFeatures, MAX_FEATURES_TO_DISPLAY);
    let limitExceeded = false;
    
    while (totalFetched < fetchLimit) {
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
        resultOffset: offset.toString(),
        resultRecordCount: FETCH_BATCH_SIZE.toString(),
        f: 'geojson',
      });

      const url = `${serviceUrl}/${layerId}/query?${esriQuery.toString()}`;
      const response = await fetch(url, { signal });
      
      if (!response.ok) break;

      const geoJsonData = await response.json();
      if (!geoJsonData.features || geoJsonData.features.length === 0) break;

      // Cap at MAX_FEATURES_TO_DISPLAY
      const batchSize = Math.min(geoJsonData.features.length, fetchLimit - totalFetched);
      const batchToSend = geoJsonData.features.slice(0, batchSize);
      totalFetched += batchSize;
      
      // Check if we've hit the limit
      if (maxFeatures > MAX_FEATURES_TO_DISPLAY && totalFetched >= MAX_FEATURES_TO_DISPLAY) {
        limitExceeded = true;
      }
      
      onBatchReceived(batchToSend, totalFetched, limitExceeded);
      
      // Stop if we've reached our display limit
      if (limitExceeded) break;
      
      // If we got fewer features than requested, we've reached the end
      if (geoJsonData.features.length < FETCH_BATCH_SIZE) break;
      
      offset += FETCH_BATCH_SIZE;
    }

    return totalFetched;
  };

  // Create tile layer for dense features using ArcGIS export endpoint
  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([37.7749, -122.4194], 10);

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
  }, []);

  // Zoom to extent bounds when extent changes
  useEffect(() => {
    if (!mapRef.current || !extent) return;

    let isActive = true;
    const fitExtent = async () => {
      const bounds = await extentToBounds(extent);
      if (!isActive || !bounds || !bounds.isValid()) return;
      mapRef.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    };

    fitExtent();

    return () => {
      isActive = false;
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

      // Cancel any inflight requests for these layers before starting new ones
      for (const layerId of layerServiceMap.keys()) {
        abortLayerRequest(layerId);
      }

      // Fetch features from ESRI services with feature count check
      for (const [layerId, serviceUrl] of layerServiceMap) {
        try {
          // First, check feature count for this viewport
          const featureCount = await checkFeatureCount(serviceUrl, layerId, bbox);
          
          if (featureCount === null) {
            console.warn(`Could not determine feature count for layer ${layerId}`);
            continue;
          }

          // Fetch all features as vectors with pagination support
          const controller = createLayerRequestController(layerId);
          
          // Clear any previous feature limit warning for this layer
          onFeatureLimitExceeded?.(layerId, false);
          
          try {
            const accumulatedFeatures: any[] = [];
            
            await fetchFeaturesWithPagination(
              serviceUrl,
              layerId,
              bbox,
              featureCount,
              controller.signal,
              (batch, totalSoFar, limitExceeded) => {
                // Stream features as they arrive
                accumulatedFeatures.push(...batch);
                onFeaturesLoad?.(layerId, [...accumulatedFeatures]);
                // Notify parent when feature limit is reached
                if (limitExceeded) {
                  onFeatureLimitExceeded?.(layerId, true);
                }
              }
            );
          } catch (fetchErr) {
            if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
              continue;
            }
            throw fetchErr;
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            continue;
          }
          console.error(`Error fetching features from ${serviceUrl}:`, err);
        } finally {
          layerRequestControllersRef.current.delete(layerId);
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
      for (const layerId of layerServiceMap.keys()) {
        abortLayerRequest(layerId);
      }
    };
  }, [layerServiceMap, onFeaturesLoad, onFeatureLimitExceeded]);

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
      // Cancel any inflight requests before starting new ones
      for (const layerId of layerServiceMap.keys()) {
        abortLayerRequest(layerId);
      }

      for (const [layerId, serviceUrl] of layerServiceMap) {
        try {
          // First, check feature count for this viewport
          const featureCount = await checkFeatureCount(serviceUrl, layerId, bbox);
          
          if (featureCount === null) {
            console.warn(`Could not determine feature count for layer ${layerId}`);
            continue;
          }

          // Fetch all features as vectors with pagination support
          const controller = createLayerRequestController(layerId);
          
          // Clear any previous feature limit warning for this layer
          onFeatureLimitExceeded?.(layerId, false);
          
          try {
            const accumulatedFeatures: any[] = [];
            
            await fetchFeaturesWithPagination(
              serviceUrl,
              layerId,
              bbox,
              featureCount,
              controller.signal,
              (batch, totalSoFar, limitExceeded) => {
                // Stream features as they arrive
                accumulatedFeatures.push(...batch);
                onFeaturesLoad?.(layerId, [...accumulatedFeatures]);
                // Notify parent when feature limit is reached
                if (limitExceeded) {
                  onFeatureLimitExceeded?.(layerId, true);
                }
              }
            );
          } catch (fetchErr) {
            if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
              continue;
            }
            throw fetchErr;
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            continue;
          }
          console.error(`Error fetching features from ${serviceUrl}:`, err);
        } finally {
          layerRequestControllersRef.current.delete(layerId);
        }
      }
    };

    fetchAllLayers();
    return () => {
      for (const layerId of layerServiceMap.keys()) {
        abortLayerRequest(layerId);
      }
    };
  }, [layerServiceMap, onFeaturesLoad, onFeatureLimitExceeded]);

  // Cancel requests when a layer is unselected
  useEffect(() => {
    // Track which layers we have active requests for
    const previousLayerIds = new Set(layerRequestControllersRef.current.keys());
    const currentLayerIds = new Set(layerServiceMap.keys());
    
    // Cancel requests for layers that were removed
    for (const layerId of previousLayerIds) {
      if (!currentLayerIds.has(layerId)) {
        abortLayerRequest(layerId);
      }
    }
  }, [layerServiceMap]);

  // Validate and clean coordinates recursively
  const cleanCoordinates = useCallback(function cleanCoordinatesInner(coords: any): any {
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
      .map((coord: any) => cleanCoordinatesInner(coord))
      .filter((c: any) => c !== null);
  }, []);

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

    // Remove feature layers that are no longer selected
    for (const [layerId, layer] of currentLayers) {
      if (!layersWithFeatures.has(layerId)) {
        mapRef.current.removeLayer(layer);
        currentLayers.delete(layerId);
      }
    }

    // If no layers have features, we're done
    if (layersWithFeatures.size === 0) {
      return;
    }

    // Add or update feature layers
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
        // Check visibility - skip rendering if hidden
        const isVisible = layerVisibility?.get(layerId) ?? true;
        if (!isVisible) {
          continue;
        }

        // Get opacity for this layer
        const opacity = layerOpacity?.get(layerId) ?? 1;

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
                  opacity: opacity * 0.8,
                  color: layerColor,
                  fillOpacity: opacity * 0.3,
                };
              case 'LineString':
              case 'MultiLineString':
                return {
                  weight: 3,
                  opacity: opacity * 0.8,
                  color: layerColor,
                };
              default:
                return {
                  fillColor: layerColor,
                  weight: 2,
                  opacity: opacity * 0.8,
                  color: layerColor,
                  fillOpacity: opacity * 0.3,
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
              opacity: opacity * 0.8,
              fillOpacity: opacity * 0.7,
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
  }, [featuresByLayer, cleanCoordinates, layerOpacity, layerVisibility]);

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
