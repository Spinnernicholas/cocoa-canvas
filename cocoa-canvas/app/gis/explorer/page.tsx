'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImportToCatalogDialog } from '@/components/ImportToCatalogDialog';
import ExplorerMap from '@/components/ExplorerMap';
import LayerPanel from '@/components/LayerPanel';
import BookmarkManager from '@/components/BookmarkManager';

interface LayerTreeNode {
  id: string;
  name: string;
  type?: string;
  geometryType?: string;
  description?: string;
  minScale?: number;
  maxScale?: number;
  defaultVisibility?: boolean;
  parentLayerId?: number;
  children?: LayerTreeNode[];
}

interface ServiceHierarchy {
  _serviceUrl: string;
  _hierarchy: LayerTreeNode[];
  _allLayers: any[];
}

interface Layer {
  id: string;
  title: string;
  url: string;
  type: string;
  visible: boolean;
  opacity?: number;
  geometryType?: string;
  description?: string;
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

interface ServiceTable {
  id: number;
  name: string;
  type?: string;
  description?: string;
}

interface ServiceInfo {
  serviceUrl: string;
  name: string;
  type: string;
  description?: string;
  copyrightText?: string;
  currentVersion?: string;
  capabilities?: string;
  supportedQueryFormats?: string;
  spatialReference?: { wkid?: number };
  initialExtent?: Extent;
  fullExtent?: Extent;
  extent?: Extent;
  layerCount: number;
  tableCount: number;
  tables?: ServiceTable[];
}

interface ServiceDetails {
  name?: string;
  mapName?: string;
  type?: string;
  description?: string;
  currentVersion?: string;
  capabilities?: string;
  supportedQueryFormats?: string;
  copyrightText?: string;
  spatialReference?: { wkid?: number };
  initialExtent?: Extent;
  fullExtent?: Extent;
  extent?: Extent;
  tables?: ServiceTable[];
  layers?: any[];
}

interface Widget {
  id?: string;
  label?: string;
  type?: string;
  icon?: string;
  config?: any;
  serviceUrls?: string[];
}

interface MapConfig {
  success: boolean;
  mapTitle?: string;
  portalUrl?: string;
  services?: ServiceInfo[];
  operationalLayers?: ServiceHierarchy[];
  baseLayers?: ServiceHierarchy[];
  widgets?: Widget[];
  extent?: Extent;
  error?: string;
}

interface LayerDetailsResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: any;
  properties: Record<string, any>;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string | undefined): string {
  if (!html) return '';
  // Remove HTML tags
  const withoutTags = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = withoutTags;
  return textarea.value;
}

/**
 * Recursive component to display layer hierarchy tree
 */
function LayerHierarchyTree({
  node,
  level = 0,
  selectedLayers,
  onToggleLayer,
  onZoomTo,
}: {
  node: LayerTreeNode;
  level?: number;
  selectedLayers: Map<string, LayerTreeNode>;
  onToggleLayer: (node: LayerTreeNode, checked: boolean) => void;
  onZoomTo: (layerId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedLayers.has(node.id);

  return (
    <div className="my-1">
      <div
        className={`flex items-center justify-between p-2 rounded transition-colors ${
          level > 0 ? 'ml-4' : ''
        } ${isSelected ? 'bg-cocoa-100 dark:bg-cocoa-700' : 'hover:bg-cocoa-50 dark:hover:bg-cocoa-800'}`}
      >
        <div className="flex items-center flex-1 min-w-0">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="mr-2 text-cocoa-600 dark:text-cocoa-400 font-bold flex-shrink-0"
            >
              {expanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="mr-2 w-4 flex-shrink-0"></span>}

          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleLayer(node, e.target.checked);
            }}
            className="mr-2 flex-shrink-0 w-4 h-4 cursor-pointer"
            title={isSelected ? 'Hide layer' : 'Show layer'}
          />

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-cocoa-900 dark:text-white text-sm">
              {node.name}
            </p>
            {node.description && node.description.trim() && (
              <p className="text-xs text-cocoa-700 dark:text-cocoa-300 mt-0.5 line-clamp-2">
                {stripHtml(node.description)}
              </p>
            )}
            <div className="flex gap-2 flex-wrap mt-1">
              {node.type && (
                <span className="text-xs bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-700 dark:text-cocoa-300 px-2 py-0.5 rounded">
                  {node.type}
                </span>
              )}
              {node.geometryType && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                  {node.geometryType}
                </span>
              )}
              {node.defaultVisibility === false && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                  Hidden
                </span>
              )}
            </div>
          </div>
        </div>

        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoomTo(node.id);
            }}
            className="ml-2 flex-shrink-0 text-lg hover:scale-110 transition-transform"
            title="Zoom to layer"
          >
            🔍
          </button>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="border-l border-cocoa-300 dark:border-cocoa-600 ml-4">
          {node.children!.map((child) => (
            <LayerHierarchyTree
              key={child.id}
              node={child}
              level={level + 1}
              selectedLayers={selectedLayers}
              onToggleLayer={onToggleLayer}
              onZoomTo={onZoomTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MapExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mapUrl, setMapUrl] = useState(
    'https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer'
  );
  const [loading, setLoading] = useState(false);
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [serviceDetailsByUrl, setServiceDetailsByUrl] = useState<Map<string, ServiceDetails>>(new Map());
  const [selectedLayers, setSelectedLayers] = useState<Map<string, LayerTreeNode>>(new Map());
  const [layerServiceMap, setLayerServiceMap] = useState<Map<string, string>>(new Map()); // layerId -> serviceUrl
  const [layerDetails, setLayerDetails] = useState<LayerDetailsResponse | null>(
    null
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [datasetTypes, setDatasetTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [mapFeaturesByLayer, setMapFeaturesByLayer] = useState<Map<string, GeoJSONFeature[]>>(new Map());
  const [zoomToLayerId, setZoomToLayerId] = useState<string | undefined>(undefined);
  const [layerOpacity, setLayerOpacity] = useState<Map<string, number>>(new Map());
  const [layerVisibility, setLayerVisibility] = useState<Map<string, boolean>>(new Map());
  const [featureLimitExceeded, setFeatureLimitExceeded] = useState<Map<string, boolean>>(new Map());
  const [isRestoringFromUrl, setIsRestoringFromUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'layers' | 'widgets' | 'selected'>('services');
  const [selectedServiceUrl, setSelectedServiceUrl] = useState<string | null>(null);
  const [loadedServiceHierarchies, setLoadedServiceHierarchies] = useState<Map<string, ServiceHierarchy>>(new Map());
  const [loadingServices, setLoadingServices] = useState<Map<string, boolean>>(new Map());
  const [serviceDetailsQueue, setServiceDetailsQueue] = useState<string[]>([]);
  const [currentlyLoadingServiceUrl, setCurrentlyLoadingServiceUrl] = useState<string | null>(null);
  const [drawerWidth, setDrawerWidth] = useState(340); // Default width in pixels
  const resultsRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Serialize current state to URL parameters
  const getCurrentStateUrl = useCallback(() => {
    const params = new URLSearchParams();
    
    // Add map service URL
    if (mapUrl) {
      params.set('map', encodeURIComponent(mapUrl));
    }
    
    // Add selected layers
    if (selectedLayers.size > 0) {
      const layerIds = Array.from(selectedLayers.keys());
      params.set('layers', layerIds.join(','));
    }
    
    // Add layer opacity
    if (layerOpacity.size > 0) {
      const opacityEntries: string[] = [];
      layerOpacity.forEach((opacity, layerId) => {
        if (opacity !== 1) { // Only save non-default
          opacityEntries.push(`${layerId}:${opacity}`);
        }
      });
      if (opacityEntries.length > 0) {
        params.set('opacity', opacityEntries.join(','));
      }
    }
    
    // Add layer visibility
    if (layerVisibility.size > 0) {
      const invisibleLayers: string[] = [];
      layerVisibility.forEach((visible, layerId) => {
        if (!visible) { // Only save invisible layers
          invisibleLayers.push(layerId);
        }
      });
      if (invisibleLayers.length > 0) {
        params.set('hidden', invisibleLayers.join(','));
      }
    }
    
    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
  }, [mapUrl, selectedLayers, layerOpacity, layerVisibility]);

  // Load state from URL parameters
  const loadStateFromUrl = useCallback(async (url: string) => {
    try {
      setIsRestoringFromUrl(true);
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      // Load map URL
      const mapParam = params.get('map');
      if (!mapParam) return;
      
      const decodedMapUrl = decodeURIComponent(mapParam);
      setMapUrl(decodedMapUrl);
      
      // Clear existing state
      setError(null);
      setMapConfig(null);
      setServiceDetails(null);
      setServiceDetailsByUrl(new Map());
      setSelectedLayers(new Map());
      setLayerServiceMap(new Map());
      setMapFeaturesByLayer(new Map());
      setFeatureLimitExceeded(new Map());
      setLayerDetails(null);
      setSelectedServiceUrl(null);
      setLoadedServiceHierarchies(new Map());
      setLoadingServices(new Map());
      setServiceDetailsQueue([]);
      setCurrentlyLoadingServiceUrl(null);
      
      // Wait for map to load
      setLoading(true);
      
      const isServiceUrl = decodedMapUrl.includes('/rest/services/') ||
        decodedMapUrl.includes('/MapServer') ||
        decodedMapUrl.includes('/FeatureServer');

      let config: MapConfig | null = null;
      let details: ServiceDetails | null = null;

      if (isServiceUrl) {
        const response = await fetch(
          `/api/v1/gis/layer-details?url=${encodeURIComponent(decodedMapUrl)}`
        );
        const data = await response.json();

        if (!data.success || !data.data) {
          setError(data.error || 'Failed to load service details');
          return;
        }

        details = data.data;
        setServiceDetails(details);

        const hierarchy = buildLayerHierarchyFromLayers(data.data.layers || []);
        const extent = details.initialExtent || details.fullExtent || details.extent;

        config = {
          success: true,
          mapTitle: details.mapName || details.name || 'Map Service',
          operationalLayers: [
            {
              _serviceUrl: decodedMapUrl,
              _hierarchy: hierarchy,
              _allLayers: data.data.layers || [],
            },
          ],
          extent,
        };
      } else {
        const response = await fetch(
          `/api/v1/gis/explore-map?url=${encodeURIComponent(decodedMapUrl)}`
        );
        config = await response.json();

        if (!config || !config.success) {
          setError(config?.error || 'Failed to load map configuration');
          return;
        }
      }
      
      if (!config) return;
      setMapConfig(config);
      
      // Restore selected layers
      const layersParam = params.get('layers');
      if (layersParam && config.operationalLayers) {
        const layerIds = layersParam.split(',');
        const newSelectedLayers = new Map<string, LayerTreeNode>();
        const newLayerServiceMap = new Map<string, string>();
        
        // Find layers in the hierarchy
        for (const serviceHierarchy of config.operationalLayers) {
          const findLayer = (nodes: LayerTreeNode[]): void => {
            for (const node of nodes) {
              if (layerIds.includes(node.id)) {
                newSelectedLayers.set(node.id, node);
                newLayerServiceMap.set(node.id, serviceHierarchy._serviceUrl);
              }
              if (node.children) {
                findLayer(node.children);
              }
            }
          };
          findLayer(serviceHierarchy._hierarchy);
        }
        
        setSelectedLayers(newSelectedLayers);
        setLayerServiceMap(newLayerServiceMap);
        
        // Restore opacity
        const opacityParam = params.get('opacity');
        if (opacityParam) {
          const newOpacity = new Map<string, number>();
          opacityParam.split(',').forEach(entry => {
            const [layerId, opacity] = entry.split(':');
            if (layerId && opacity) {
              newOpacity.set(layerId, parseFloat(opacity));
            }
          });
          setLayerOpacity(newOpacity);
        }
        
        // Restore visibility
        const hiddenParam = params.get('hidden');
        if (hiddenParam) {
          const newVisibility = new Map<string, boolean>();
          const hiddenLayerIds = hiddenParam.split(',');
          layerIds.forEach(layerId => {
            newVisibility.set(layerId, !hiddenLayerIds.includes(layerId));
          });
          setLayerVisibility(newVisibility);
        }
      }
    } catch (err) {
      console.error('Failed to load state from URL:', err);
      setError('Failed to restore bookmark state');
    } finally {
      setLoading(false);
      setIsRestoringFromUrl(false);
    }
  }, []);

  // Load state from URL on mount
  useEffect(() => {
    const mapParam = searchParams.get('map');
    if (mapParam && !isRestoringFromUrl) {
      loadStateFromUrl(window.location.href);
    }
  }, []); // Only run on mount

  // Memoized callback to handle features loaded from map
  const handleFeaturesLoad = useCallback((layerId: string, features: GeoJSONFeature[]) => {
    setMapFeaturesByLayer(prev => {
      const newMap = new Map(prev);
      newMap.set(layerId, features);
      return newMap;
    });
  }, []);

  // Memoized callback to clear zoom state after completing
  const handleZoomComplete = useCallback(() => {
    setZoomToLayerId(undefined);
  }, []);

  // Memoized callback to handle feature limit exceeded
  const handleFeatureLimitExceeded = useCallback((layerId: string, limitReached: boolean) => {
    setFeatureLimitExceeded(prev => {
      const newMap = new Map(prev);
      newMap.set(layerId, limitReached);
      return newMap;
    });
  }, []);

  const getServiceTypeFromUrl = (serviceUrl: string): string => {
    // Extract any *Server pattern from the URL
    const match = serviceUrl.match(/\/([A-Za-z]+Server)(?:\/|$)/i);
    return match ? match[1] : 'Service';
  };

  const getServiceNameFromUrl = (serviceUrl: string): string => {
    // Match the service path before any *Server pattern
    const match = serviceUrl.match(/\/services\/(.+?)\/([A-Za-z]+Server)(?:\/|$)/i);
    if (match && match[1]) {
      return match[1].replace(/\//g, ' / ');
    }
    return serviceUrl.replace(/^https?:\/\//, '').split('/')[0];
  };

  useEffect(() => {
    if (!mapConfig?.operationalLayers) return;

    let isActive = true;
    const fetchServiceDetails = async () => {
      const nextMap = new Map(serviceDetailsByUrl);

      for (const service of mapConfig.operationalLayers || []) {
        const serviceUrl = (service as ServiceHierarchy)._serviceUrl;
        if (!serviceUrl || nextMap.has(serviceUrl)) continue;

        try {
          const response = await fetch(
            `/api/v1/gis/layer-details?url=${encodeURIComponent(serviceUrl)}`
          );
          if (!response.ok) continue;
          const data = await response.json();
          if (!data.success || !data.data) continue;
          nextMap.set(serviceUrl, data.data as ServiceDetails);
        } catch (err) {
          console.warn('Failed to fetch service details:', serviceUrl, err);
        }
      }

      if (isActive) {
        setServiceDetailsByUrl(new Map(nextMap));
      }
    };

    fetchServiceDetails();

    return () => {
      isActive = false;
    };
  }, [mapConfig]);

  // Handle layer opacity changes
  const handleLayerOpacityChange = useCallback((layerId: string, opacity: number) => {
    setLayerOpacity(prev => {
      const newMap = new Map(prev);
      newMap.set(layerId, opacity);
      return newMap;
    });
  }, []);

  // Handle layer visibility changes
  const handleLayerVisibilityToggle = useCallback((layerId: string, visible: boolean) => {
    setLayerVisibility(prev => {
      const newMap = new Map(prev);
      newMap.set(layerId, visible);
      return newMap;
    });
  }, []);

  // Handle layer removal from the panel
  const handleLayerRemove = useCallback((layerId: string) => {
    // Remove from selected layers
    const newSelectedLayers = new Map(selectedLayers);
    newSelectedLayers.delete(layerId);
    setSelectedLayers(newSelectedLayers);

    // Remove from service map
    const newLayerServiceMap = new Map(layerServiceMap);
    newLayerServiceMap.delete(layerId);
    setLayerServiceMap(newLayerServiceMap);

    // Remove from features
    const newMapFeatures = new Map(mapFeaturesByLayer);
    newMapFeatures.delete(layerId);
    setMapFeaturesByLayer(newMapFeatures);

    // Remove from opacity and visibility
    const newOpacity = new Map(layerOpacity);
    newOpacity.delete(layerId);
    setLayerOpacity(newOpacity);

    const newVisibility = new Map(layerVisibility);
    newVisibility.delete(layerId);
    setLayerVisibility(newVisibility);

    const newFeatureLimitExceeded = new Map(featureLimitExceeded);
    newFeatureLimitExceeded.delete(layerId);
    setFeatureLimitExceeded(newFeatureLimitExceeded);

    // Clear details if no layers selected
    if (newSelectedLayers.size === 0) {
      setLayerDetails(null);
    }
  }, [selectedLayers, layerServiceMap, mapFeaturesByLayer, layerOpacity, layerVisibility]);

  // Fetch dataset types on component mount
  useEffect(() => {
    const fetchDatasetTypes = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/v1/gis/dataset-types', { headers });
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setDatasetTypes(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dataset types:', err);
      }
    };

    fetchDatasetTypes();
  }, []);

  // Queue services for background loading when mapConfig changes
  useEffect(() => {
    if (!mapConfig?.services) return;

    // Find services that haven't had details loaded yet
    const servicesToLoad = mapConfig.services
      .filter(service => !service.detailsLoaded)
      .map(service => service.serviceUrl);

    if (servicesToLoad.length > 0) {
      console.log(`[Services] Queueing ${servicesToLoad.length} services for background loading`);
      setServiceDetailsQueue(servicesToLoad);
    }
  }, [mapConfig]);

  // Process service details queue one at a time
  useEffect(() => {
    if (serviceDetailsQueue.length === 0 || currentlyLoadingServiceUrl) return;
    if (!mapConfig?.services) return;

    const loadNextService = async () => {
      const serviceUrl = serviceDetailsQueue[0];
      setCurrentlyLoadingServiceUrl(serviceUrl);

      try {
        console.log(`[Services] Loading details for: ${serviceUrl}`);
        
        const response = await fetch(
          `/api/v1/gis/layer-details?url=${encodeURIComponent(serviceUrl)}`
        );
        const data = await response.json();

        if (data.success && data.data) {
          const serviceDetails = data.data;

          // Update the service in mapConfig with full details
          setMapConfig(prev => {
            if (!prev) return prev;

            const updatedServices = prev.services?.map(service => {
              if (service.serviceUrl === serviceUrl) {
                return {
                  ...service,
                  name: serviceDetails.mapName || serviceDetails.name || service.name,
                  description: serviceDetails.description || serviceDetails.serviceDescription,
                  copyrightText: serviceDetails.copyrightText,
                  currentVersion: serviceDetails.currentVersion,
                  capabilities: serviceDetails.capabilities,
                  supportedQueryFormats: serviceDetails.supportedQueryFormats,
                  spatialReference: serviceDetails.spatialReference,
                  initialExtent: serviceDetails.initialExtent,
                  fullExtent: serviceDetails.fullExtent,
                  extent: serviceDetails.extent,
                  layerCount: serviceDetails.layers?.length || 0,
                  tableCount: serviceDetails.tables?.length || 0,
                  tables: serviceDetails.tables,
                  detailsLoaded: true,
                };
              }
              return service;
            });

            return {
              ...prev,
              services: updatedServices,
            };
          });

          console.log(`[Services] Loaded details for ${serviceUrl}`);
        } else {
          console.warn(`[Services] Failed to load details for ${serviceUrl}:`, data.error);
        }
      } catch (err) {
        console.error(`[Services] Error loading details for ${serviceUrl}:`, err);
      } finally {
        // Remove from queue and clear currently loading
        setServiceDetailsQueue(prev => prev.slice(1));
        setCurrentlyLoadingServiceUrl(null);
      }
    };

    loadNextService();
  }, [serviceDetailsQueue, currentlyLoadingServiceUrl, mapConfig]);

  const handleExploreMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMapConfig(null);
    setServiceDetails(null);
    setServiceDetailsByUrl(new Map());
    setSelectedLayers(new Map());
    setLayerServiceMap(new Map());
    setMapFeaturesByLayer(new Map());
    setFeatureLimitExceeded(new Map());
    setLayerDetails(null);
    setLayerOpacity(new Map());
    setLayerVisibility(new Map());
    setSelectedServiceUrl(null);
    setLoadedServiceHierarchies(new Map());
    setLoadingServices(new Map());
    setServiceDetailsQueue([]);
    setCurrentlyLoadingServiceUrl(null);

    try {
      const isServiceUrl = mapUrl.includes('/rest/services/') ||
        mapUrl.includes('/MapServer') ||
        mapUrl.includes('/FeatureServer');

      if (isServiceUrl) {
        const response = await fetch(
          `/api/v1/gis/layer-details?url=${encodeURIComponent(mapUrl)}`
        );
        const data = await response.json();

        if (!data.success || !data.data) {
          setError(data.error || 'Failed to load service details');
        } else {
          const details: ServiceDetails = data.data;
          setServiceDetails(details);

          const hierarchy = buildLayerHierarchyFromLayers(data.data.layers || []);
          const extent = details.initialExtent || details.fullExtent || details.extent;

          setMapConfig({
            success: true,
            mapTitle: details.mapName || details.name || 'Map Service',
            operationalLayers: [
              {
                _serviceUrl: mapUrl,
                _hierarchy: hierarchy,
                _allLayers: data.data.layers || [],
              },
            ],
            extent,
          });
        }
      } else {
        const response = await fetch(
          `/api/v1/gis/explore-map?url=${encodeURIComponent(mapUrl)}`
        );
        const data: MapConfig = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to load map configuration');
        } else {
          setMapConfig(data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load map');
    } finally {
      setLoading(false);
    }
  };

  const buildLayerHierarchyFromLayers = (layers: any[]): LayerTreeNode[] => {
    const layersMap = new Map<number, LayerTreeNode>();
    const rootLayers: LayerTreeNode[] = [];

    layers.forEach((layer: any) => {
      const node: LayerTreeNode = {
        id: `${layer.id}`,
        name: layer.name || `Layer ${layer.id}`,
        type: layer.type,
        geometryType: layer.geometryType,
        description: layer.description,
        minScale: layer.minScale,
        maxScale: layer.maxScale,
        defaultVisibility: layer.defaultVisibility,
        parentLayerId: layer.parentLayerId,
        children: [],
      };
      layersMap.set(layer.id, node);
    });

    layersMap.forEach((node) => {
      if (node.parentLayerId !== undefined && node.parentLayerId !== -1) {
        const parent = layersMap.get(node.parentLayerId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        rootLayers.push(node);
      }
    });

    return rootLayers;
  };

  const buildLayerHierarchy = async (
    serviceUrl: string
  ): Promise<LayerTreeNode[]> => {
    try {
      const response = await fetch(
        `/api/v1/gis/layer-details?url=${encodeURIComponent(serviceUrl)}`
      );
      const data = await response.json();

      if (!data.success || !data.data?.layers) {
        return [];
      }

      return buildLayerHierarchyFromLayers(data.data.layers || []);
    } catch (err) {
      console.error('Error building hierarchy:', err);
      return [];
    }
  };

  const handleToggleLayer = async (node: LayerTreeNode, checked: boolean) => {
    const newSelectedLayers = new Map(selectedLayers);
    const newLayerServiceMap = new Map(layerServiceMap);

    if (checked) {
      // Add layer
      newSelectedLayers.set(node.id, node);
      
      // Find and store the service URL for this layer
      if (node.id && mapConfig?.operationalLayers) {
        const service = mapConfig.operationalLayers.find(
          (l) => l._hierarchy?.some((h) => h.id === node.id || h.children?.some((c) => findNodeById(c, node.id)))
        );
        if (service) {
          newLayerServiceMap.set(node.id, service._serviceUrl);
        }
      }

      // Initialize opacity and visibility for this layer
      const newOpacity = new Map(layerOpacity);
      if (!newOpacity.has(node.id)) {
        newOpacity.set(node.id, 1);
      }
      setLayerOpacity(newOpacity);

      const newVisibility = new Map(layerVisibility);
      if (!newVisibility.has(node.id)) {
        newVisibility.set(node.id, true);
      }
      setLayerVisibility(newVisibility);
    } else {
      // Remove layer
      newSelectedLayers.delete(node.id);
      newLayerServiceMap.delete(node.id);
      
      // Also remove the features for this layer
      const newMapFeatures = new Map(mapFeaturesByLayer);
      newMapFeatures.delete(node.id);
      setMapFeaturesByLayer(newMapFeatures);

      // Remove opacity and visibility
      const newOpacity = new Map(layerOpacity);
      newOpacity.delete(node.id);
      setLayerOpacity(newOpacity);

      const newVisibility = new Map(layerVisibility);
      newVisibility.delete(node.id);
      setLayerVisibility(newVisibility);
    }

    setSelectedLayers(newSelectedLayers);
    setLayerServiceMap(newLayerServiceMap);

    // Update details to show first selected layer
    if (newSelectedLayers.size > 0) {
      const firstLayer = Array.from(newSelectedLayers.values())[0];
      const serviceUrl = newLayerServiceMap.get(firstLayer.id);
      
      if (serviceUrl) {
        setDetailsLoading(true);
        try {
          const detailsResponse = await fetch(
            `/api/v1/gis/layer-details?url=${encodeURIComponent(
              serviceUrl
            )}&layerId=${firstLayer.id}`
          );
          const detailsData: LayerDetailsResponse = await detailsResponse.json();
          setLayerDetails(detailsData);
        } catch (err) {
          console.error('Error fetching layer details:', err);
        } finally {
          setDetailsLoading(false);
        }
      }
    } else {
      setLayerDetails(null);
    }
  };

  const findNodeById = (node: LayerTreeNode, id: string): boolean => {
    if (node.id === id) return true;
    if (node.children) {
      return node.children.some((child) => findNodeById(child, id));
    }
    return false;
  };

  const handleOpenImportDialog = async () => {
    if (selectedLayers.size === 0) return;

    // Get the first selected layer
    const firstLayer = Array.from(selectedLayers.values())[0];
    const serviceUrl = layerServiceMap.get(firstLayer.id);
    
    if (!serviceUrl) return;

    // First, save this layer as a remote dataset if not already done
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('You must be logged in to add layers to the catalog');
        return;
      }
      
      const response = await fetch('/api/v1/gis/remote-datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceUrl: serviceUrl,
          layerId: parseInt(firstLayer.id),
          layerName: firstLayer.name,
          layerType: firstLayer.type,
          geometryType: firstLayer.geometryType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setImportDialogOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to save remote dataset:', err);
      alert('Failed to prepare layer for import');
    }
  };

  const handleImportToCatalog = async (
    formData: any
  ) => {
    if (selectedLayers.size === 0) return;

    // Get the first selected layer
    const firstLayer = Array.from(selectedLayers.values())[0];
    const serviceUrl = layerServiceMap.get(firstLayer.id);
    
    if (!serviceUrl) return;

    setImportLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('You must be logged in to import layers');
      }
      
      // First save the remote dataset
      const remoteDatasetResponse = await fetch('/api/v1/gis/remote-datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceUrl: serviceUrl,
          layerId: parseInt(firstLayer.id),
          layerName: firstLayer.name,
          layerType: firstLayer.type,
          geometryType: firstLayer.geometryType,
        }),
      });

      if (!remoteDatasetResponse.ok) {
        throw new Error('Failed to save remote dataset');
      }

      const remoteDatasetData = await remoteDatasetResponse.json();
      if (!remoteDatasetData.success) {
        throw new Error(remoteDatasetData.error || 'Failed to save remote dataset');
      }

      const remoteDatasetId = remoteDatasetData.data?.id;
      if (!remoteDatasetId) {
        throw new Error('No remote dataset ID received');
      }

      // Now import to catalog
      const importResponse = await fetch('/api/v1/gis/remote-datasets/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          remoteDatasetId,
          catalogName: formData.catalogName,
          catalogDescription: formData.catalogDescription,
          datasetTypeId: formData.datasetTypeId,
          tags: formData.tags,
          category: formData.category,
          isPublic: formData.isPublic,
          importMode: formData.importMode,
        }),
      });

      if (!importResponse.ok) {
        throw new Error('Failed to import to catalog');
      }

      const importData = await importResponse.json();
      if (!importData.success) {
        throw new Error(importData.error || 'Failed to import to catalog');
      }

      setImportSuccess(`Successfully imported "${formData.catalogName}" to catalog${formData.importMode === 'local' ? ' (local storage)' : ' (remote reference)'}!`);
      setImportDialogOpen(false);

      // Clear success message after 3 seconds
      setTimeout(() => setImportSuccess(null), 3000);
    } catch (err) {
      throw err;
    } finally {
      setImportLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // Load service details and hierarchy
  const loadServiceDetails = async (serviceUrl: string) => {
    // Mark as loading
    setLoadingServices(prev => {
      const newMap = new Map(prev);
      newMap.set(serviceUrl, true);
      return newMap;
    });

    try {
      const response = await fetch(
        `/api/v1/gis/layer-details?url=${encodeURIComponent(serviceUrl)}`
      );
      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to load service details');
      }

      // Build hierarchy from layers
      const hierarchy = buildLayerHierarchyFromLayers(data.data.layers || []);
      
      // Store the hierarchy
      setLoadedServiceHierarchies(prev => {
        const newMap = new Map(prev);
        newMap.set(serviceUrl, {
          _serviceUrl: serviceUrl,
          _hierarchy: hierarchy,
          _allLayers: data.data.layers || [],
        });
        return newMap;
      });

      // Also update the layerServiceMap for all layers in this service
      const newLayerServiceMap = new Map(layerServiceMap);
      const addLayersToMap = (nodes: LayerTreeNode[]) => {
        for (const node of nodes) {
          newLayerServiceMap.set(node.id, serviceUrl);
          if (node.children) {
            addLayersToMap(node.children);
          }
        }
      };
      addLayersToMap(hierarchy);
      setLayerServiceMap(newLayerServiceMap);

    } catch (err) {
      console.error('Failed to load service details:', err);
      alert('Failed to load service details: ' + (err as Error).message);
    } finally {
      // Mark as not loading
      setLoadingServices(prev => {
        const newMap = new Map(prev);
        newMap.set(serviceUrl, false);
        return newMap;
      });
    }
  };

  // Resize handle mouse event handlers
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = drawerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(250, Math.min(800, startWidthRef.current + delta)); // Min 250px, max 800px
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drawerWidth]);

  return (
    <div className="h-screen flex flex-col bg-cocoa-50 dark:bg-cocoa-900 overflow-hidden">
      {/* Browser-like Toolbar */}
      <div className="bg-white dark:bg-cocoa-800 border-b border-cocoa-200 dark:border-cocoa-700 px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
        {/* Back Button */}
        <Link
          href="/catalog"
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cocoa-100 dark:hover:bg-cocoa-700 text-cocoa-600 dark:text-cocoa-400 transition-colors"
          title="Back to Catalog"
        >
          <span className="text-lg">←</span>
        </Link>

        {/* URL/Address Bar */}
        <form onSubmit={handleExploreMap} className="flex-1 flex items-center gap-2 bg-cocoa-50 dark:bg-cocoa-700 rounded-lg px-3 py-2 border border-cocoa-200 dark:border-cocoa-600 focus-within:ring-2 focus-within:ring-cocoa-500">
          <span className="text-cocoa-400 flex-shrink-0">🗺️</span>
          <input
            type="url"
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            placeholder="https://.../arcgis/rest/services/.../MapServer"
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none text-cocoa-900 dark:text-white placeholder-cocoa-400 dark:placeholder-cocoa-500 disabled:opacity-60"
          />
        </form>

        {/* Bookmark Manager */}
        <BookmarkManager 
          currentUrl={getCurrentStateUrl()}
          onLoadBookmark={loadStateFromUrl}
        />

        {/* Explore Button */}
        <button
          onClick={handleExploreMap}
          disabled={loading || !mapUrl.trim()}
          className="flex-shrink-0 px-5 py-2 rounded-lg bg-cocoa-600 hover:bg-cocoa-700 disabled:bg-cocoa-400 dark:bg-cocoa-700 dark:hover:bg-cocoa-600 text-white font-semibold transition-colors text-sm"
        >
          {loading ? 'loading...' : 'explore'}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Drawer */}
        <div 
          style={{ width: `${drawerWidth}px` }}
          className="bg-white dark:bg-cocoa-800 border-r border-cocoa-200 dark:border-cocoa-700 flex overflow-hidden shadow-lg"
        >
          {/* Drawer Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-cocoa-200 dark:border-cocoa-700 bg-cocoa-50 dark:bg-cocoa-700">
              <h2 className="font-semibold text-cocoa-900 dark:text-white text-sm">
                {mapConfig && mapConfig.mapTitle ? mapConfig.mapTitle : 'Explorer'}
              </h2>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="m-3 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded text-red-800 dark:text-red-100 text-sm">
                  <p className="font-semibold">Error:</p>
                  <p className="mt-1 text-xs">{error}</p>
                </div>
              )}

              {!mapConfig && (
                <div className="p-4 space-y-3 text-sm text-cocoa-700 dark:text-cocoa-300">
                  <h3 className="font-semibold text-cocoa-900 dark:text-white">Getting Started</h3>
                  <ol className="list-decimal list-inside space-y-2 text-xs">
                    <li>Paste an ArcGIS Map Service URL in the address bar</li>
                    <li>Click the Explore button</li>
                    <li>Browse the layer hierarchy and select layers</li>
                    <li>Review service metadata and tables</li>
                  </ol>
                </div>
              )}

              {mapConfig && (
                <div className="space-y-4">
                {/* Services Tab */}
                {activeTab === 'services' && (
                  <div className="space-y-4">
                    {/* Service Drill-Down View */}
                    {selectedServiceUrl && mapConfig.services ? (
                      <div>
                        {/* Back Button */}
                        <button
                          onClick={() => setSelectedServiceUrl(null)}
                          className="mb-3 px-3 py-2 text-sm font-semibold bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-900 dark:text-white rounded hover:bg-cocoa-200 dark:hover:bg-cocoa-600 transition-colors flex items-center gap-2"
                        >
                          ← Back to Services
                        </button>

                        {(() => {
                          const service = mapConfig.services.find(s => s.serviceUrl === selectedServiceUrl);
                          if (!service) return null;

                          // Find the service hierarchy - check both operationalLayers and loadedServiceHierarchies
                          const serviceHierarchy = mapConfig.operationalLayers?.find(s => s._serviceUrl === selectedServiceUrl) || loadedServiceHierarchies.get(selectedServiceUrl);
                          const isLoading = loadingServices.get(selectedServiceUrl) || false;
                          const hasBeenLoaded = loadedServiceHierarchies.has(selectedServiceUrl) || mapConfig.operationalLayers?.some(s => s._serviceUrl === selectedServiceUrl);

                          return (
                            <div className="space-y-4">
                              {/* Service Header */}
                              <div className="bg-white dark:bg-cocoa-800 rounded border border-cocoa-200 dark:border-cocoa-600 p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-cocoa-900 dark:text-white">
                                      {service.name}
                                    </h3>
                                    <span className="inline-block text-[10px] uppercase bg-cocoa-200 dark:bg-cocoa-600 text-cocoa-800 dark:text-cocoa-200 px-2 py-0.5 rounded mt-1">
                                      {service.type}
                                    </span>
                                  </div>
                                </div>

                                {/* URL */}
                                <div className="mb-3">
                                  <h5 className="text-xs font-semibold text-cocoa-800 dark:text-cocoa-200 mb-1">URL</h5>
                                  <div className="bg-cocoa-50 dark:bg-cocoa-800 p-2 rounded font-mono text-[10px] break-all">
                                    <a
                                      href={service.serviceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-cocoa-600 dark:text-cocoa-400 hover:underline"
                                    >
                                      {service.serviceUrl}
                                    </a>
                                  </div>
                                </div>

                                {/* Description */}
                                {service.description && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-semibold text-cocoa-800 dark:text-cocoa-200 mb-1">Description</h5>
                                    <p className="text-xs text-cocoa-700 dark:text-cocoa-300">
                                      {stripHtml(service.description)}
                                    </p>
                                  </div>
                                )}

                                {/* Stats */}
                                <div className="flex gap-4 mb-3">
                                  <div>
                                    <h5 className="text-xs font-semibold text-cocoa-800 dark:text-cocoa-200">Layers</h5>
                                    <p className="text-xs text-cocoa-700 dark:text-cocoa-300">{service.layerCount}</p>
                                  </div>
                                  {service.tableCount > 0 && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-cocoa-800 dark:text-cocoa-200">Tables</h5>
                                      <p className="text-xs text-cocoa-700 dark:text-cocoa-300">{service.tableCount}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Extent */}
                                {(service.initialExtent || service.fullExtent || service.extent) && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-semibold text-cocoa-800 dark:text-cocoa-200 mb-1">Extent</h5>
                                    <div className="bg-cocoa-50 dark:bg-cocoa-800 p-2 rounded font-mono text-[10px]">
                                      {(() => {
                                        const ext = service.initialExtent || service.fullExtent || service.extent;
                                        if (!ext) return null;
                                        return (
                                          <>
                                            <p>X: {ext.xmin.toFixed(2)} to {ext.xmax.toFixed(2)}</p>
                                            <p>Y: {ext.ymin.toFixed(2)} to {ext.ymax.toFixed(2)}</p>
                                            {ext.spatialReference?.wkid && (
                                              <p>WKID: {ext.spatialReference.wkid}</p>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Version & Capabilities */}
                                {(service.currentVersion || service.capabilities) && (
                                  <div className="mb-3 space-y-1">
                                    {service.currentVersion && (
                                      <p className="text-xs"><span className="font-semibold text-cocoa-800 dark:text-cocoa-200">Version:</span> {service.currentVersion}</p>
                                    )}
                                    {service.capabilities && (
                                      <p className="text-xs"><span className="font-semibold text-cocoa-800 dark:text-cocoa-200">Capabilities:</span> {service.capabilities}</p>
                                    )}
                                  </div>
                                )}

                                {/* Copyright */}
                                {service.copyrightText && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-cocoa-800 dark:text-cocoa-200 mb-1">Copyright</h5>
                                    <p className="text-[10px] text-cocoa-600 dark:text-cocoa-400">
                                      {service.copyrightText}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Layer Hierarchy */}
                              <div className="bg-white dark:bg-cocoa-800 rounded border border-cocoa-200 dark:border-cocoa-600 p-4">
                                <h4 className="text-sm font-semibold text-cocoa-900 dark:text-white mb-3">
                                  📍 Layer Hierarchy ({service.layerCount})
                                </h4>
                                <div>
                                  {!hasBeenLoaded && !isLoading ? (
                                    // Show button to load service details
                                    <div className="text-center py-6">
                                      <button
                                        onClick={() => loadServiceDetails(selectedServiceUrl)}
                                        className="px-4 py-2 bg-cocoa-600 hover:bg-cocoa-700 dark:bg-cocoa-700 dark:hover:bg-cocoa-600 text-white rounded font-semibold transition-colors text-sm"
                                      >
                                        📥 Load Service Details & Layers
                                      </button>
                                      <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-2">
                                        Click to fetch detailed layer information
                                      </p>
                                    </div>
                                  ) : isLoading ? (
                                    // Show loading state
                                    <div className="text-center py-6">
                                      <div className="text-cocoa-600 dark:text-cocoa-400 text-sm">
                                        ⏳ Loading service details...
                                      </div>
                                    </div>
                                  ) : serviceHierarchy && serviceHierarchy._hierarchy && serviceHierarchy._hierarchy.length > 0 ? (
                                    // Show hierarchy
                                    <div className="space-y-0">
                                      {serviceHierarchy._hierarchy.map((rootLayer, layerIdx) => (
                                        <LayerHierarchyTree
                                          key={layerIdx}
                                          node={rootLayer}
                                          level={0}
                                          selectedLayers={selectedLayers}
                                          onToggleLayer={handleToggleLayer}
                                          onZoomTo={(layerId) => setZoomToLayerId(layerId)}
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    // Show no layers only after loading
                                    <p className="text-xs text-cocoa-600 dark:text-cocoa-400 p-2">No layers available</p>
                                  )}
                                </div>
                              </div>

                              {/* Tables */}
                              {service.tables && service.tables.length > 0 && (
                                <div className="bg-white dark:bg-cocoa-800 rounded border border-cocoa-200 dark:border-cocoa-600 p-4">
                                  <h4 className="text-sm font-semibold text-cocoa-900 dark:text-white mb-2">
                                    📋 Tables ({service.tables.length})
                                  </h4>
                                  <ul className="space-y-1">
                                    {service.tables.map((table) => (
                                      <li key={table.id} className="text-xs text-cocoa-700 dark:text-cocoa-300">
                                        • {table.name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* Services List View */
                      mapConfig.services && mapConfig.services.length > 0 ? (
                        <div className="space-y-2">
                          {mapConfig.services.map((service, idx) => {
                            const isCurrentlyLoading = currentlyLoadingServiceUrl === service.serviceUrl;
                            const isQueued = serviceDetailsQueue.includes(service.serviceUrl);
                            const queuePosition = isQueued ? serviceDetailsQueue.indexOf(service.serviceUrl) : -1;
                            const showLoading = !service.detailsLoaded && (isCurrentlyLoading || isQueued);

                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedServiceUrl(service.serviceUrl)}
                                className="w-full text-left p-3 bg-white dark:bg-cocoa-800 rounded border border-cocoa-200 dark:border-cocoa-600 hover:border-cocoa-400 dark:hover:border-cocoa-500 hover:shadow-md transition-all relative"
                              >
                                {showLoading && (
                                  <div className="absolute top-2 right-2">
                                    {isCurrentlyLoading ? (
                                      <div className="flex items-center gap-1 text-[10px] text-cocoa-600 dark:text-cocoa-400 bg-cocoa-100 dark:bg-cocoa-700 px-2 py-1 rounded">
                                        <span className="animate-spin">⏳</span>
                                        <span>Loading...</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-[10px] text-cocoa-500 dark:text-cocoa-500 bg-cocoa-50 dark:bg-cocoa-750 px-2 py-1 rounded">
                                        <span>⏸</span>
                                        <span>Queue #{queuePosition + 1}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0 pr-20">
                                    <div className="text-sm font-semibold text-cocoa-900 dark:text-white truncate">
                                      {service.name}
                                    </div>
                                    {service.detailsLoaded ? (
                                      <>
                                        <div className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1 truncate">
                                          {service.layerCount} layer{service.layerCount !== 1 ? 's' : ''}{service.tableCount > 0 ? ` • ${service.tableCount} table${service.tableCount !== 1 ? 's' : ''}` : ''}
                                        </div>
                                        {service.description && (
                                          <div className="text-xs text-cocoa-700 dark:text-cocoa-300 mt-1 line-clamp-1">
                                            {stripHtml(service.description)}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-xs text-cocoa-500 dark:text-cocoa-500 mt-1 italic">
                                        {isCurrentlyLoading ? 'Loading details...' : isQueued ? 'Waiting to load...' : 'Details not loaded'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0">
                                    <span className="text-[10px] uppercase bg-cocoa-200 dark:bg-cocoa-600 text-cocoa-800 dark:text-cocoa-200 px-2 py-0.5 rounded whitespace-nowrap">
                                      {service.type}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-cocoa-600 dark:text-cocoa-400">
                          No services found
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Layers Tab */}
                {activeTab === 'layers' && (
                  <div className="space-y-4">
                    {mapConfig.operationalLayers && mapConfig.operationalLayers.length > 0 ? (
                      <div>
                        <h4 className="text-xs font-semibold text-cocoa-900 dark:text-white px-2 py-1 bg-cocoa-100 dark:bg-cocoa-700">
                          📍 Layers ({mapConfig.operationalLayers.reduce((sum, s) => sum + (s._hierarchy?.length || 0), 0)})
                        </h4>
                        <div className="space-y-1">
                      {mapConfig.operationalLayers.map((service, idx) => {
                        const serviceUrl = service._serviceUrl;
                        // Find the matching service info from mapConfig.services
                        const serviceInfo = mapConfig.services?.find(s => s.serviceUrl === serviceUrl);
                        const serviceName = serviceInfo?.name || getServiceNameFromUrl(serviceUrl);
                        const serviceType = serviceInfo?.type || getServiceTypeFromUrl(serviceUrl);
                        const serviceDescription = serviceInfo?.description;

                        return (
                        <details key={idx} className="text-xs">
                          <summary className="cursor-pointer font-semibold text-cocoa-900 dark:text-white px-3 py-2 hover:bg-cocoa-100 dark:hover:bg-cocoa-700 rounded">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs block truncate">
                                {serviceName}
                              </span>
                              <span className="text-[10px] uppercase bg-cocoa-200 dark:bg-cocoa-600 text-cocoa-800 dark:text-cocoa-200 px-2 py-0.5 rounded">
                                {serviceType}
                              </span>
                            </div>
                            {serviceDescription && (
                              <p className="text-[10px] text-cocoa-600 dark:text-cocoa-400 mt-1 line-clamp-2">
                                {stripHtml(serviceDescription)}
                              </p>
                            )}
                          </summary>
                          <div className="ml-2 space-y-0">
                            {service._hierarchy && service._hierarchy.length > 0 ? (
                              service._hierarchy.map((rootLayer, layerIdx) => (
                                <LayerHierarchyTree
                                  key={layerIdx}
                                  node={rootLayer}
                                  level={0}
                                  selectedLayers={selectedLayers}
                                  onToggleLayer={handleToggleLayer}
                                  onZoomTo={(layerId) => setZoomToLayerId(layerId)}
                                />
                              ))
                            ) : (
                              <p className="text-cocoa-600 dark:text-cocoa-400 text-xs p-2">No layers</p>
                            )}
                          </div>
                        </details>
                        );
                      })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-cocoa-600 dark:text-cocoa-400">
                        No layers found
                      </div>
                    )}

                    {/* Base Layers */}
                    {mapConfig.baseLayers && mapConfig.baseLayers.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-cocoa-900 dark:text-white px-2 py-1 bg-cocoa-100 dark:bg-cocoa-700 mt-4">
                          🗺️ Base Layers ({mapConfig.baseLayers.length})
                        </h4>
                        <div className="space-y-1">
                      {mapConfig.baseLayers.map((service, idx) => (
                        <details key={idx} className="text-xs">
                          <summary className="cursor-pointer font-semibold text-cocoa-900 dark:text-white px-3 py-2 hover:bg-cocoa-100 dark:hover:bg-cocoa-700 rounded">
                            <span className="text-xs block truncate">
                              {service._serviceUrl.replace(/^https?:\/\//, '').split('/')[0]}
                            </span>
                          </summary>
                          <div className="ml-2 space-y-0">
                            {service._hierarchy && service._hierarchy.length > 0 ? (
                              service._hierarchy.map((rootLayer, layerIdx) => (
                                <LayerHierarchyTree
                                  key={layerIdx}
                                  node={rootLayer}
                                  level={0}
                                  selectedLayers={selectedLayers}
                                  onToggleLayer={handleToggleLayer}
                                  onZoomTo={(layerId) => setZoomToLayerId(layerId)}
                                />
                              ))
                            ) : (
                              <p className="text-cocoa-600 dark:text-cocoa-400 text-xs p-2">No layers</p>
                            )}
                          </div>
                        </details>
                      ))}
                      </div>
                    </div>
                    )}
                  </div>
                )}

                {/* Widgets Tab */}
                {activeTab === 'widgets' && (
                  <div className="space-y-4">
                    {mapConfig.widgets && mapConfig.widgets.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {mapConfig.widgets.map((widget, idx) => (
                          <details key={idx} className="text-xs bg-white dark:bg-cocoa-800 rounded border border-cocoa-200 dark:border-cocoa-600">
                            <summary className="cursor-pointer px-3 py-2 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 rounded">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-cocoa-900 dark:text-white block truncate">
                                  {widget.icon && <span className="mr-2">{widget.icon}</span>}
                                  {widget.label || widget.id || 'Widget'}
                                </span>
                                {widget.serviceUrls && widget.serviceUrls.length > 0 && (
                                  <span className="text-[10px] uppercase bg-cinnamon-200 dark:bg-cinnamon-600 text-cinnamon-800 dark:text-cinnamon-200 px-2 py-0.5 rounded flex-shrink-0">
                                    {widget.serviceUrls.length} service{widget.serviceUrls.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </summary>
                            <div className="px-3 pb-3 pt-1 space-y-2 text-xs text-cocoa-700 dark:text-cocoa-300">
                              {/* Widget Type */}
                              {widget.type && (
                                <div>
                                  <h5 className="font-semibold text-cocoa-800 dark:text-cocoa-200 mb-1">Type</h5>
                                  <p className="text-cocoa-700 dark:text-cocoa-300 font-mono text-[10px]">
                                    {widget.type}
                                  </p>
                                </div>
                              )}

                              {/* Associated Services */}
                              {widget.serviceUrls && widget.serviceUrls.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-cocoa-800 dark:text-cocoa-200 mb-1">Associated Services</h5>
                                  <div className="space-y-1">
                                    {widget.serviceUrls.map((serviceUrl, sIdx) => {
                                      const serverTypeMatch = serviceUrl.match(/\/([A-Za-z]+Server)(?:\/|$)/i);
                                      const serverType = serverTypeMatch ? serverTypeMatch[1] : 'Service';
                                      const serviceNameMatch = serviceUrl.match(/\/services\/(.+?)\/[A-Za-z]+Server/);
                                      const serviceName = serviceNameMatch ? serviceNameMatch[1].replace(/\//g, ' / ') : serviceUrl.split('/').slice(-2, -1)[0];
                                      
                                      return (
                                        <div key={sIdx} className="bg-cocoa-50 dark:bg-cocoa-800 p-2 rounded">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-cocoa-800 dark:text-cocoa-200">{serviceName}</span>
                                            <span className="text-[10px] uppercase bg-cocoa-200 dark:bg-cocoa-600 text-cocoa-800 dark:text-cocoa-200 px-1.5 py-0.5 rounded">
                                              {serverType}
                                            </span>
                                          </div>
                                          <a
                                            href={serviceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cocoa-600 dark:text-cocoa-400 hover:underline font-mono text-[10px] break-all"
                                          >
                                            {serviceUrl}
                                          </a>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-cocoa-600 dark:text-cocoa-400">
                        No widgets found
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Tab */}
                {activeTab === 'selected' && (
                  <div className="space-y-4">
                    {selectedLayers.size > 0 ? (
                      <div className="mt-4 border-t border-cocoa-200 dark:border-cocoa-700 pt-4">
                <LayerPanel
                  layers={Array.from(selectedLayers.values()).map((layer) => ({
                    id: layer.id,
                    name: layer.name,
                    type: layer.type,
                    geometryType: layer.geometryType,
                    visible: layerVisibility.get(layer.id) !== false,
                    opacity: layerOpacity.get(layer.id) || 1,
                  }))}
                  onVisibilityChange={handleLayerVisibilityToggle}
                  onOpacityChange={handleLayerOpacityChange}
                  onRemoveLayer={handleLayerRemove}
                />

                {/* Feature Limit Warnings */}
                {Array.from(featureLimitExceeded.entries()).map(([layerId, limitExceeded]) => {
                  if (!limitExceeded) return null;
                  const layer = selectedLayers.get(layerId);
                  if (!layer) return null;
                  return (
                    <div
                      key={layerId}
                      className="mt-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 text-lg">⚠️</span>
                        <div className="flex-1">
                          <div className="font-semibold text-yellow-800 dark:text-yellow-200">
                            Feature Limit Reached: {layer.name}
                          </div>
                          <div className="text-yellow-700 dark:text-yellow-300 mt-0.5 text-xs">
                            Displaying first 10,000 features. Use spatial filters or zoom in to see other features.
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Import and details section */}
                <div className="mt-3 pt-3 border-t border-cocoa-200 dark:border-cocoa-700">
                  {importSuccess && (
                    <div className="px-2 py-1 mb-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded text-green-800 dark:text-green-100 text-xs">
                      {importSuccess}
                    </div>
                  )}

                  <button
                    onClick={handleOpenImportDialog}
                    disabled={selectedLayers.size === 0}
                    className="w-full px-3 py-1 rounded text-sm bg-cinnamon-600 dark:bg-cinnamon-700 text-white hover:bg-cinnamon-700 dark:hover:bg-cinnamon-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    ➕ Add to Catalog
                  </button>
                  <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1 px-2">
                    Imports the first selected layer
                  </p>
                </div>

                {detailsLoading && (
                  <div className="text-center py-2 text-xs text-cocoa-600 dark:text-cocoa-400 mt-3">
                    Loading details...
                  </div>
                )}

                {layerDetails?.success && layerDetails.data && (
                  <div className="space-y-2 text-xs mt-3 px-2">
                    {layerDetails.data.description && (
                      <div>
                        <h5 className="font-semibold text-cocoa-800 dark:text-cocoa-200">
                          Description
                        </h5>
                        <p className="text-cocoa-700 dark:text-cocoa-300 line-clamp-2">
                          {layerDetails.data.description}
                        </p>
                      </div>
                    )}

                    {layerDetails.data.extent && (
                      <div>
                        <h5 className="font-semibold text-cocoa-800 dark:text-cocoa-200">
                          Extent
                        </h5>
                        <div className="bg-cocoa-100 dark:bg-cocoa-700 p-1.5 rounded font-mono text-xs text-cocoa-900 dark:text-cocoa-100">
                          <p>X: {layerDetails.data.extent.xmin.toFixed(2)} to {layerDetails.data.extent.xmax.toFixed(2)}</p>
                          <p>Y: {layerDetails.data.extent.ymin.toFixed(2)} to {layerDetails.data.extent.ymax.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-cocoa-600 dark:text-cocoa-400">
                        No layers selected
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="w-1 bg-cocoa-300 dark:bg-cocoa-600 hover:bg-cocoa-400 dark:hover:bg-cocoa-500 cursor-col-resize hover:w-1.5 transition-all flex-shrink-0"
          title="Drag to resize drawer"
        />

        {/* Vertical Tab Navigation */}
        {mapConfig && (
            <div className="flex flex-col border-l border-cocoa-200 dark:border-cocoa-700 bg-cocoa-50 dark:bg-cocoa-800">
              <button
                onClick={() => setActiveTab('services')}
                className={`flex-1 px-2 py-3 transition-colors relative group ${
                  activeTab === 'services'
                    ? 'bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white border-l-2 border-cocoa-600 dark:border-cocoa-400'
                    : 'text-cocoa-600 dark:text-cocoa-400 hover:bg-cocoa-100 dark:hover:bg-cocoa-700'
                }`}
                title="Services"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-lg">🌐</div>
                  <div className="text-[10px] font-semibold mt-1" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    SVC
                  </div>
                  {mapConfig.services && mapConfig.services.length > 0 && (
                    <span className="text-[10px] bg-cocoa-200 dark:bg-cocoa-600 text-cocoa-700 dark:text-cocoa-300 px-1 py-0.5 rounded mt-1">
                      {mapConfig.services.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('layers')}
                className={`flex-1 px-2 py-3 transition-colors relative group ${
                  activeTab === 'layers'
                    ? 'bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white border-l-2 border-cocoa-600 dark:border-cocoa-400'
                    : 'text-cocoa-600 dark:text-cocoa-400 hover:bg-cocoa-100 dark:hover:bg-cocoa-700'
                }`}
                title="Layers"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-lg">📍</div>
                  <div className="text-[10px] font-semibold mt-1" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    LYR
                  </div>
                  {mapConfig.operationalLayers && mapConfig.operationalLayers.length > 0 && (
                    <span className="text-[10px] bg-cocoa-200 dark:bg-cocoa-600 text-cocoa-700 dark:text-cocoa-300 px-1 py-0.5 rounded mt-1">
                      {mapConfig.operationalLayers.reduce((sum, s) => sum + (s._hierarchy?.length || 0), 0)}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('widgets')}
                className={`flex-1 px-2 py-3 transition-colors relative group ${
                  activeTab === 'widgets'
                    ? 'bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white border-l-2 border-cocoa-600 dark:border-cocoa-400'
                    : 'text-cocoa-600 dark:text-cocoa-400 hover:bg-cocoa-100 dark:hover:bg-cocoa-700'
                }`}
                title="Widgets"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-lg">🔧</div>
                  <div className="text-[10px] font-semibold mt-1" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    WGT
                  </div>
                  {mapConfig.widgets && mapConfig.widgets.length > 0 && (
                    <span className="text-[10px] bg-cocoa-200 dark:bg-cocoa-600 text-cocoa-700 dark:text-cocoa-300 px-1 py-0.5 rounded mt-1">
                      {mapConfig.widgets.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('selected')}
                className={`flex-1 px-2 py-3 transition-colors relative group ${
                  activeTab === 'selected'
                    ? 'bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white border-l-2 border-cocoa-600 dark:border-cocoa-400'
                    : 'text-cocoa-600 dark:text-cocoa-400 hover:bg-cocoa-100 dark:hover:bg-cocoa-700'
                }`}
                title="Selected"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-lg">✓</div>
                  <div className="text-[10px] font-semibold mt-1" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    SEL
                  </div>
                  {selectedLayers.size > 0 && (
                    <span className="text-[10px] bg-cinnamon-200 dark:bg-cinnamon-600 text-cinnamon-700 dark:text-cinnamon-300 px-1 py-0.5 rounded mt-1">
                      {selectedLayers.size}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Map */}
        {mapConfig ? (
          <div className="flex-1 bg-cocoa-100 dark:bg-cocoa-700 relative">
            <ExplorerMap
              featuresByLayer={mapFeaturesByLayer}
              layerServiceMap={layerServiceMap}
              extent={mapConfig.extent}
              zoomToLayerId={zoomToLayerId}
              onFeaturesLoad={handleFeaturesLoad}
              onZoomComplete={handleZoomComplete}
              onFeatureLimitExceeded={handleFeatureLimitExceeded}
              layerOpacity={layerOpacity}
              layerVisibility={layerVisibility}
            />
          </div>
        ) : (
          <div className="flex-1 bg-gradient-to-br from-cocoa-100 to-cinnamon-100 dark:from-cocoa-700 dark:to-cinnamon-700 flex items-center justify-center">
            <div className="text-center max-w-md text-cocoa-700 dark:text-cocoa-300">
              <p className="text-6xl mb-4">🗺️</p>
              <h3 className="text-2xl font-bold mb-2">Map Explorer</h3>
              <p className="mb-6 text-sm">Paste an ArcGIS Map Service URL to get started.</p>
              <code className="block bg-cocoa-200 dark:bg-cocoa-600 p-2 rounded text-xs text-cocoa-900 dark:text-white">
                .../arcgis/rest/services/.../MapServer
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      {selectedLayers.size > 0 && (
        <ImportToCatalogDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onImport={handleImportToCatalog}
          layerName={Array.from(selectedLayers.values())[0].name}
          serviceUrl={layerServiceMap.get(Array.from(selectedLayers.keys())[0]) || ''}
          layerId={parseInt(Array.from(selectedLayers.keys())[0])}
          datasetTypes={datasetTypes}
          isLoading={importLoading}
        />
      )}
    </div>
  );
}