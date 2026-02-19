'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ImportToCatalogDialog } from '@/components/ImportToCatalogDialog';
import ExplorerMap from '@/components/ExplorerMap';

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

interface MapConfig {
  success: boolean;
  mapTitle?: string;
  portalUrl?: string;
  operationalLayers?: ServiceHierarchy[];
  baseLayers?: ServiceHierarchy[];
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

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLayer(node, !isSelected);
            }}
            className="mr-2 flex-shrink-0 text-lg"
            title={isSelected ? 'Hide layer' : 'Show layer'}
          >
            {isSelected ? '👁️' : '👁️‍🗨️'}
          </button>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-cocoa-900 dark:text-white text-sm">
              {node.name}
            </p>
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
  const [mapUrl, setMapUrl] = useState(
    'https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18'
  );
  const [loading, setLoading] = useState(false);
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
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
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch dataset types on component mount
  useEffect(() => {
    const fetchDatasetTypes = async () => {
      try {
        const response = await fetch('/api/v1/gis/dataset-types');
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

  const handleExploreMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMapConfig(null);
    setSelectedLayers(new Map());
    setLayerServiceMap(new Map());
    setMapFeaturesByLayer(new Map());
    setLayerDetails(null);

    try {
      const response = await fetch(
        `/api/v1/gis/explore-map?url=${encodeURIComponent(mapUrl)}`
      );
      const data: MapConfig = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load map configuration');
      } else {
        setMapConfig(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load map');
    } finally {
      setLoading(false);
    }
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

      // Build hierarchy from flat layer list
      const layersMap = new Map<number, LayerTreeNode>();
      const rootLayers: LayerTreeNode[] = [];

      // First pass: create all nodes
      data.data.layers.forEach((layer: any) => {
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

      // Second pass: build hierarchy
      layersMap.forEach((node, id) => {
        if (node.parentLayerId !== undefined && node.parentLayerId !== -1) {
          const parent = layersMap.get(node.parentLayerId);
          if (parent) {
            if (!parent.children) {
              parent.children = [];
            }
            parent.children.push(node);
          }
        } else {
          rootLayers.push(node);
        }
      });

      return rootLayers;
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
    } else {
      // Remove layer
      newSelectedLayers.delete(node.id);
      newLayerServiceMap.delete(node.id);
      
      // Also remove the features for this layer
      const newMapFeatures = new Map(mapFeaturesByLayer);
      newMapFeatures.delete(node.id);
      setMapFeaturesByLayer(newMapFeatures);
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
      const response = await fetch('/api/v1/gis/remote-datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      // First save the remote dataset
      const remoteDatasetResponse = await fetch('/api/v1/gis/remote-datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteDatasetId,
          catalogName: formData.catalogName,
          catalogDescription: formData.catalogDescription,
          datasetTypeId: formData.datasetTypeId,
          tags: formData.tags,
          category: formData.category,
          isPublic: formData.isPublic,
        }),
      });

      if (!importResponse.ok) {
        throw new Error('Failed to import to catalog');
      }

      const importData = await importResponse.json();
      if (!importData.success) {
        throw new Error(importData.error || 'Failed to import to catalog');
      }

      setImportSuccess(`Successfully imported "${formData.catalogName}" to catalog!`);
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
            placeholder="https://www.arcgis.com/apps/webappviewer/index.html?id=..."
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none text-cocoa-900 dark:text-white placeholder-cocoa-400 dark:placeholder-cocoa-500 disabled:opacity-60"
          />
        </form>

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
        <div className="w-80 bg-white dark:bg-cocoa-800 border-r border-cocoa-200 dark:border-cocoa-700 flex flex-col overflow-hidden shadow-lg">
          {/* Drawer Header */}
          <div className="px-4 py-3 border-b border-cocoa-200 dark:border-cocoa-700 bg-cocoa-50 dark:bg-cocoa-700">
            <h2 className="font-semibold text-cocoa-900 dark:text-white text-sm">
              {mapConfig && mapConfig.mapTitle ? mapConfig.mapTitle : 'Explorer'}
            </h2>
          </div>

          {/* Drawer Content */}
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
                  <li>Paste an ArcGIS Web App URL in the address bar</li>
                  <li>Click the Explore button (←)</li>
                  <li>Click on layers to view details</li>
                  <li>Add layers to your catalog</li>
                </ol>
              </div>
            )}

            {mapConfig && (
              <div className="space-y-4">
                {/* Portal Info */}
                {mapConfig.portalUrl && (
                  <div className="text-xs text-cocoa-600 dark:text-cocoa-400 p-2">
                    <p className="truncate">
                      <strong>Portal:</strong>{' '}
                      <a
                        href={mapConfig.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cocoa-600 dark:text-cocoa-400 hover:underline"
                      >
                        {mapConfig.portalUrl.replace(/^https?:\/\//, '').split('/')[0]}
                      </a>
                    </p>
                  </div>
                )}

                {/* Operational Layers */}
                {mapConfig.operationalLayers && mapConfig.operationalLayers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-cocoa-900 dark:text-white px-2 py-1 bg-cocoa-100 dark:bg-cocoa-700">
                      📍 Services ({mapConfig.operationalLayers.length})
                    </h4>
                    <div className="space-y-1">
                      {mapConfig.operationalLayers.map((service, idx) => (
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

                {/* Base Layers */}
                {mapConfig.baseLayers && mapConfig.baseLayers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-cocoa-900 dark:text-white px-2 py-1 bg-cocoa-100 dark:bg-cocoa-700">
                      🗺️ Base Services ({mapConfig.baseLayers.length})
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

            {/* Layer Details Panel */}
            {selectedLayers.size > 0 && (
              <div className="border-t border-cocoa-200 dark:border-cocoa-700 mt-4 pt-4">
                <div className="px-2 mb-3">
                  <h4 className="font-semibold text-cocoa-900 dark:text-white text-sm mb-2">
                    Selected Layers ({selectedLayers.size})
                  </h4>
                  <div className="space-y-2 text-xs">
                    {Array.from(selectedLayers.values()).slice(0, 3).map((layer) => (
                      <div key={layer.id} className="bg-cocoa-50 dark:bg-cocoa-700 p-2 rounded">
                        <p className="font-semibold text-cocoa-900 dark:text-white">{layer.name}</p>
                        <p className="text-cocoa-600 dark:text-cocoa-400">{layer.type || 'Layer'}</p>
                      </div>
                    ))}
                    {selectedLayers.size > 3 && (
                      <p className="text-cocoa-600 dark:text-cocoa-400 italic">+ {selectedLayers.size - 3} more layer{selectedLayers.size - 3 !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>

                {/* Success Message */}
                {importSuccess && (
                  <div className="mx-2 px-2 py-1 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded text-green-800 dark:text-green-100 text-xs mb-2">
                    {importSuccess}
                  </div>
                )}

                {/* Import Button for first layer */}
                <div className="px-2">
                  <button
                    onClick={handleOpenImportDialog}
                    disabled={selectedLayers.size === 0}
                    className="w-full px-3 py-1 rounded text-sm bg-cinnamon-600 dark:bg-cinnamon-700 text-white hover:bg-cinnamon-700 dark:hover:bg-cinnamon-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    ➕ Add to Catalog
                  </button>
                  <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1">
                    Imports the first selected layer
                  </p>
                </div>

                {detailsLoading ? (
                  <div className="text-center py-3 text-xs text-cocoa-600 dark:text-cocoa-400 px-2">
                    Loading details...
                  </div>
                ) : layerDetails ? (
                  <div className="space-y-3 px-2 text-xs">
                    {layerDetails.success ? (
                      <>
                        {layerDetails.data?.description && (
                          <div>
                            <h5 className="font-semibold text-cocoa-800 dark:text-cocoa-200 mb-1">
                              Description
                            </h5>
                            <p className="text-cocoa-700 dark:text-cocoa-300 line-clamp-2">
                              {layerDetails.data.description}
                            </p>
                          </div>
                        )}

                        {layerDetails.data?.extent && (
                          <div>
                            <h5 className="font-semibold text-cocoa-800 dark:text-cocoa-200 mb-1">
                              Extent
                            </h5>
                            <div className="bg-cocoa-100 dark:bg-cocoa-700 p-2 rounded font-mono text-xs text-cocoa-900 dark:text-cocoa-100 space-y-0">
                              <p>XMin: {layerDetails.data.extent.xmin.toFixed(2)}</p>
                              <p>YMin: {layerDetails.data.extent.ymin.toFixed(2)}</p>
                              <p>XMax: {layerDetails.data.extent.xmax.toFixed(2)}</p>
                              <p>YMax: {layerDetails.data.extent.ymax.toFixed(2)}</p>
                            </div>
                          </div>
                        )}

                        {layerDetails.data?.copyrightText && (
                          <div className="text-cocoa-600 dark:text-cocoa-400 pt-2 border-t border-cocoa-200 dark:border-cocoa-600">
                            <strong className="text-xs">©</strong> {layerDetails.data.copyrightText}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-red-600 dark:text-red-400 text-xs">
                        Error: {layerDetails.error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3 text-xs text-cocoa-600 dark:text-cocoa-400 px-2">
                    Click a layer to view details
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Full-screen Map */}
        {mapConfig ? (
          <div className="flex-1 bg-cocoa-100 dark:bg-cocoa-700 relative">
            {selectedLayers.size > 0 ? (
              <ExplorerMap
                key={Array.from(selectedLayers.keys()).join(',')}
                featuresByLayer={mapFeaturesByLayer}
                layerServiceMap={layerServiceMap}
                extent={mapConfig.extent}
                zoomToLayerId={zoomToLayerId}
                onFeaturesLoad={(layerId, features) => {
                  const newMapFeatures = new Map(mapFeaturesByLayer);
                  newMapFeatures.set(layerId, features);
                  setMapFeaturesByLayer(newMapFeatures);
                }}
                onZoomComplete={() => setZoomToLayerId(undefined)}
              />
            ) : (
              <ExplorerMap
                featuresByLayer={new Map()}
                layerServiceMap={new Map()}
                extent={mapConfig.extent}
                zoomToLayerId={zoomToLayerId}
                onZoomComplete={() => setZoomToLayerId(undefined)}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 bg-gradient-to-br from-cocoa-100 to-cinnamon-100 dark:from-cocoa-700 dark:to-cinnamon-700 flex flex-col items-center justify-center text-cocoa-700 dark:text-cocoa-300">
            <div className="text-center max-w-md">
              <p className="text-6xl mb-4">🗺️</p>
              <h3 className="text-2xl font-bold mb-2">Map Explorer</h3>
              <p className="mb-6">Paste an ArcGIS Web App URL in the address bar above to get started.</p>
              <div className="text-sm space-y-2 text-cocoa-600 dark:text-cocoa-400">
                <p>💡 Try a public Web App URL like:</p>
                <code className="block bg-cocoa-200 dark:bg-cocoa-600 p-2 rounded text-xs">
                  arcgis.com/apps/webappviewer
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import to Catalog Dialog */}
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
