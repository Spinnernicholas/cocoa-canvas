'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ImportToCatalogDialog } from '@/components/ImportToCatalogDialog';

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

interface MapConfig {
  success: boolean;
  mapTitle?: string;
  portalUrl?: string;
  operationalLayers?: ServiceHierarchy[];
  baseLayers?: ServiceHierarchy[];
  error?: string;
}

interface LayerDetailsResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Recursive component to display layer hierarchy tree
 */
function LayerHierarchyTree({
  node,
  level = 0,
  onSelectLayer,
}: {
  node: LayerTreeNode;
  level?: number;
  onSelectLayer: (node: LayerTreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="my-1">
      <div
        className={`flex items-start p-2 rounded cursor-pointer hover:bg-cocoa-100 dark:hover:bg-cocoa-600 transition-colors ${
          level > 0 ? 'ml-4' : ''
        }`}
        onClick={() => onSelectLayer(node)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mr-2 text-cocoa-600 dark:text-cocoa-400 font-bold"
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="mr-2 w-4"></span>}

        <div className="flex-1">
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

      {expanded && hasChildren && (
        <div className="border-l border-cocoa-300 dark:border-cocoa-600 ml-4">
          {node.children!.map((child) => (
            <LayerHierarchyTree
              key={child.id}
              node={child}
              level={level + 1}
              onSelectLayer={onSelectLayer}
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
  const [selectedNode, setSelectedNode] = useState<LayerTreeNode | null>(null);
  const [selectedServiceUrl, setSelectedServiceUrl] = useState<string | null>(null);
  const [layerDetails, setLayerDetails] = useState<LayerDetailsResponse | null>(
    null
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [datasetTypes, setDatasetTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
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
    setSelectedNode(null);
    setLayerDetails(null);

    try {
      const response = await fetch(
        `/api/v1/gis/explore-map?url=${encodeURIComponent(mapUrl)}`
      );
      const data: MapConfig = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load map configuration');
        return;
      }

      setMapConfig(data);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred'
      );
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

  const handleSelectNode = async (node: LayerTreeNode) => {
    setSelectedNode(node);
    setDetailsLoading(true);
    setLayerDetails(null);

    try {
      // If it's a root layer with URL, fetch details
      if (node.id && mapConfig?.operationalLayers) {
        const service = mapConfig.operationalLayers.find(
          (l) => l._hierarchy?.some((h) => h.id === node.id || h.children?.some((c) => findNodeById(c, node.id)))
        );

        if (service) {
          setSelectedServiceUrl(service._serviceUrl);
          const response = await fetch(
            `/api/v1/gis/layer-details?url=${encodeURIComponent(
              service._serviceUrl
            )}&layerId=${node.id}`
          );
          const data: LayerDetailsResponse = await response.json();
          setLayerDetails(data);
        }
      }
    } catch (err) {
      setLayerDetails({
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to load details',
      });
    } finally {
      setDetailsLoading(false);
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
    if (!selectedNode || !selectedServiceUrl) return;

    // First, save this layer as a remote dataset if not already done
    try {
      const response = await fetch('/api/v1/gis/remote-datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceUrl: selectedServiceUrl,
          layerId: parseInt(selectedNode.id),
          layerName: selectedNode.name,
          layerType: selectedNode.type,
          geometryType: selectedNode.geometryType,
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
    if (!selectedNode || !selectedServiceUrl) return;

    setImportLoading(true);
    try {
      // First save the remote dataset
      const remoteDatasetResponse = await fetch('/api/v1/gis/remote-datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceUrl: selectedServiceUrl,
          layerId: parseInt(selectedNode.id),
          layerName: selectedNode.name,
          layerType: selectedNode.type,
          geometryType: selectedNode.geometryType,
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
    <div className="min-h-screen bg-white dark:bg-cocoa-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white p-8 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Map/Endpoint Explorer</h1>
          <p className="text-cocoa-100">
            Explore layers and services from ArcGIS maps and applications
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {/* Input Form */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 mb-8 border border-cocoa-200 dark:border-cocoa-700">
          <form onSubmit={handleExploreMap}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-cocoa-900 dark:text-cocoa-100 mb-3">
                Map URL
              </label>
              <input
                type="url"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://www.arcgis.com/apps/webappviewer/index.html?id=..."
                disabled={loading}
                className="w-full px-4 py-3 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cocoa-500 disabled:bg-cocoa-100 dark:disabled:bg-cocoa-600"
              />
              <p className="mt-2 text-xs text-cocoa-600 dark:text-cocoa-400">
                Paste a public ArcGIS Web App URL or Web Map ID
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !mapUrl.trim()}
              className="w-full bg-cocoa-600 hover:bg-cocoa-700 disabled:bg-cocoa-400 dark:bg-cocoa-700 dark:hover:bg-cocoa-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Explore Map'}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-8 text-red-800 dark:text-red-100">
            <p className="font-semibold">Error:</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* Results */}
        {mapConfig && (
          <div ref={resultsRef} className="space-y-6">
            {/* Map Info */}
            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 border border-cocoa-200 dark:border-cocoa-700">
              <h2 className="text-2xl font-bold text-cocoa-900 dark:text-white mb-4">
                {mapConfig.mapTitle}
              </h2>
              {mapConfig.portalUrl && (
                <div className="text-sm text-cocoa-700 dark:text-cocoa-300">
                  <p>
                    <strong>Portal:</strong>{' '}
                    <a
                      href={mapConfig.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cocoa-600 dark:text-cocoa-400 hover:underline"
                    >
                      {mapConfig.portalUrl}
                    </a>
                  </p>
                </div>
              )}
            </div>

            {/* Operational Layers */}
            {mapConfig.operationalLayers &&
              mapConfig.operationalLayers.length > 0 && (
                <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 border border-cocoa-200 dark:border-cocoa-700">
                  <h3 className="text-xl font-bold text-cocoa-900 dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">📍</span>
                    Operational Services ({mapConfig.operationalLayers.length})
                  </h3>
                  <div className="space-y-4">
                    {mapConfig.operationalLayers.map((service, idx) => (
                      <div key={idx} className="border border-cocoa-300 dark:border-cocoa-600 rounded-lg p-4 bg-cocoa-50 dark:bg-cocoa-700">
                        <details open>
                          <summary className="cursor-pointer font-semibold text-cocoa-900 dark:text-white mb-3">
                            <span className="text-sm text-cocoa-600 dark:text-cocoa-400">
                              Service: {service._serviceUrl.replace(/^https?:\/\//, '').replace(/\/MapServer.*/, '')}
                            </span>
                          </summary>
                          <div className="ml-2 space-y-1">
                            {service._hierarchy && service._hierarchy.length > 0 ? (
                              service._hierarchy.map((rootLayer, layerIdx) => (
                                <LayerHierarchyTree
                                  key={layerIdx}
                                  node={rootLayer}
                                  level={0}
                                  onSelectLayer={() => {
                                    setSelectedNode(rootLayer);
                                    handleSelectNode(rootLayer);
                                  }}
                                />
                              ))
                            ) : (
                              <p className="text-cocoa-600 dark:text-cocoa-400 text-sm">No layers in this service</p>
                            )}
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Base Layers */}
            {mapConfig.baseLayers && mapConfig.baseLayers.length > 0 && (
              <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 border border-cocoa-200 dark:border-cocoa-700">
                <h3 className="text-xl font-bold text-cocoa-900 dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-2">🗺️</span>
                  Base Services ({mapConfig.baseLayers.length})
                </h3>
                <div className="space-y-4">
                  {mapConfig.baseLayers.map((service, idx) => (
                    <div key={idx} className="border border-cocoa-300 dark:border-cocoa-600 rounded-lg p-4 bg-cocoa-50 dark:bg-cocoa-700">
                      <details open>
                        <summary className="cursor-pointer font-semibold text-cocoa-900 dark:text-white mb-3">
                          <span className="text-sm text-cocoa-600 dark:text-cocoa-400">
                            Service: {service._serviceUrl.replace(/^https?:\/\//, '').replace(/\/(MapServer|TileServer|FeatureServer).*/, '')}
                          </span>
                        </summary>
                        <div className="ml-2 space-y-1">
                          {service._hierarchy && service._hierarchy.length > 0 ? (
                            service._hierarchy.map((rootLayer, layerIdx) => (
                              <LayerHierarchyTree
                                key={layerIdx}
                                node={rootLayer}
                                level={0}
                                onSelectLayer={() => {
                                  setSelectedNode(rootLayer);
                                  handleSelectNode(rootLayer);
                                }}
                              />
                            ))
                          ) : (
                            <p className="text-cocoa-600 dark:text-cocoa-400 text-sm">No layers in this service</p>
                          )}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Layer Details */}
            {selectedNode && (
              <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 border border-cocoa-200 dark:border-cocoa-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-cocoa-900 dark:text-white">
                    Layer Details: {selectedNode.name}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedNode(null);
                      setLayerDetails(null);
                      setSelectedServiceUrl(null);
                    }}
                    className="text-cocoa-500 dark:text-cocoa-400 hover:text-cocoa-700 dark:hover:text-cocoa-300"
                  >
                    ✕
                  </button>
                </div>

                {/* Success Message */}
                {importSuccess && (
                  <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded p-4 mb-4 text-green-800 dark:text-green-100">
                    {importSuccess}
                  </div>
                )}

                {/* Import Button */}
                <div className="mb-6">
                  <button
                    onClick={handleOpenImportDialog}
                    disabled={!selectedNode}
                    className="px-4 py-2 rounded bg-cinnamon-600 dark:bg-cinnamon-700 text-white hover:bg-cinnamon-700 dark:hover:bg-cinnamon-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    ➕ Add to Catalog
                  </button>
                  <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-2">
                    Import this layer as a remote GIS dataset to your catalog
                  </p>
                </div>

                {detailsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-cocoa-600 dark:text-cocoa-400">Loading layer details...</p>
                  </div>
                ) : layerDetails ? (
                  <div className="space-y-4">
                    {layerDetails.success ? (
                      <>
                        {layerDetails.data?.description && (
                          <div>
                            <h4 className="font-semibold text-cocoa-800 dark:text-cocoa-200 mb-2">
                              Description
                            </h4>
                            <p className="text-cocoa-700 dark:text-cocoa-300 text-sm">
                              {layerDetails.data.description}
                            </p>
                          </div>
                        )}

                        {layerDetails.data?.extent && (
                          <div>
                            <h4 className="font-semibold text-cocoa-800 dark:text-cocoa-200 mb-2">
                              Extent (Bounding Box)
                            </h4>
                            <div className="bg-cocoa-100 dark:bg-cocoa-700 p-3 rounded text-xs font-mono text-cocoa-900 dark:text-cocoa-100">
                              <p>
                                XMin: {layerDetails.data.extent.xmin.toFixed(2)}
                              </p>
                              <p>
                                YMin: {layerDetails.data.extent.ymin.toFixed(2)}
                              </p>
                              <p>
                                XMax: {layerDetails.data.extent.xmax.toFixed(2)}
                              </p>
                              <p>
                                YMax: {layerDetails.data.extent.ymax.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        )}

                        {layerDetails.data?.layers &&
                          layerDetails.data.layers.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-cocoa-800 dark:text-cocoa-200 mb-2">
                                Sub-layers ({layerDetails.data.layers.length})
                              </h4>
                              <div className="space-y-2">
                                {layerDetails.data.layers.map(
                                  (sublayer: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-cocoa-50 dark:bg-cocoa-700 p-3 rounded border border-cocoa-200 dark:border-cocoa-600"
                                    >
                                      <p className="font-mono text-sm text-cocoa-900 dark:text-white">
                                        <strong>ID:</strong> {sublayer.id}
                                      </p>
                                      <p className="font-mono text-sm text-cocoa-900 dark:text-white">
                                        <strong>Name:</strong> {sublayer.name}
                                      </p>
                                      {sublayer.type && (
                                        <p className="font-mono text-sm text-cocoa-900 dark:text-white">
                                          <strong>Type:</strong>{' '}
                                          {sublayer.type}
                                        </p>
                                      )}
                                      {sublayer.geometryType && (
                                        <p className="font-mono text-sm text-cocoa-900 dark:text-white">
                                          <strong>Geometry:</strong>{' '}
                                          {sublayer.geometryType}
                                        </p>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {layerDetails.data?.copyrightText && (
                          <div className="text-xs text-cocoa-600 dark:text-cocoa-400 pt-2 border-t border-cocoa-200 dark:border-cocoa-600">
                            <strong>Copyright:</strong> {layerDetails.data.copyrightText}
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-cocoa-200 dark:border-cocoa-600">
                          <p className="text-xs text-cocoa-600 dark:text-cocoa-400">
                            <strong>Raw JSON:</strong>
                          </p>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-cocoa-600 dark:text-cocoa-400 hover:underline text-sm">
                              Show raw service response
                            </summary>
                            <pre className="mt-2 bg-cocoa-100 dark:bg-cocoa-700 p-3 rounded overflow-auto text-xs text-cocoa-900 dark:text-white">
                              {JSON.stringify(layerDetails.data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </>
                    ) : (
                      <div className="text-red-600 dark:text-red-400 text-sm">
                        Error loading details: {layerDetails.error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-cocoa-600 dark:text-cocoa-400">Click a layer to view details</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        {!mapConfig && (
          <div className="bg-cocoa-50 dark:bg-cocoa-700 border border-cocoa-200 dark:border-cocoa-600 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-cocoa-900 dark:text-white mb-3">
              How to use this explorer
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-cocoa-800 dark:text-cocoa-200 text-sm">
              <li>
                Paste a public ArcGIS Web App URL into the input field above
              </li>
              <li>
                Click "Explore Map" to load all layers from that map
              </li>
              <li>
                Click on any layer to view its details and service endpoint
                information
              </li>
              <li>
                Use the "Copy URL" button to copy any service endpoint
              </li>
            </ol>

            <div className="mt-6 bg-white dark:bg-cocoa-800 rounded p-4 border border-cocoa-200 dark:border-cocoa-600">
              <h4 className="font-semibold text-cocoa-900 dark:text-white mb-2">
                Example URLs:
              </h4>
              <ul className="space-y-2 text-sm text-cocoa-700 dark:text-cocoa-300">
                <li>
                  <code className="bg-cocoa-100 dark:bg-cocoa-700 px-2 py-1 rounded text-xs text-cocoa-900 dark:text-white">
                    https://www.arcgis.com/apps/webappviewer/index.html?id={'{'}id{'}'}
                  </code>
                </li>
                <li>
                  <code className="bg-cocoa-100 dark:bg-cocoa-700 px-2 py-1 rounded text-xs text-cocoa-900 dark:text-white">
                    https://cocogis.maps.arcgis.com/apps/webappbuilder/...
                  </code>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-cocoa-100 dark:bg-cocoa-700 border-t border-cocoa-300 dark:border-cocoa-600 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <p className="text-sm text-cocoa-700 dark:text-cocoa-300">
            <Link href="/" className="text-cocoa-600 dark:text-cocoa-400 hover:underline">
              ← Back to Dashboard
            </Link>
          </p>
        </div>
      </div>

      {/* Import to Catalog Dialog */}
      {selectedNode && (
        <ImportToCatalogDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onImport={handleImportToCatalog}
          layerName={selectedNode.name}
          serviceUrl={selectedServiceUrl || ''}
          layerId={parseInt(selectedNode.id)}
          datasetTypes={datasetTypes}
          isLoading={importLoading}
        />
      )}
    </div>
  );
}
