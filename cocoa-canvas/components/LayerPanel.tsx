'use client';

import { useState, useMemo } from 'react';

interface LayerItemData {
  id: string;
  name: string;
  type?: string;
  geometryType?: string;
  visible: boolean;
  opacity: number;
}

interface LayerPanelProps {
  layers: LayerItemData[];
  onVisibilityChange: (layerId: string, visible: boolean) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
  onRemoveLayer: (layerId: string) => void;
}

export default function LayerPanel({
  layers,
  onVisibilityChange,
  onOpacityChange,
  onRemoveLayer,
}: LayerPanelProps) {
  const [searchText, setSearchText] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const layerColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const getLayerColor = (index: number) => layerColors[index % layerColors.length];

  const filteredLayers = useMemo(() => {
    if (!searchText.trim()) return layers;
    const query = searchText.toLowerCase();
    return layers.filter(
      (layer) =>
        layer.name.toLowerCase().includes(query) ||
        layer.type?.toLowerCase().includes(query) ||
        layer.geometryType?.toLowerCase().includes(query)
    );
  }, [layers, searchText]);

  const toggleExpanded = (layerId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-cocoa-800 border border-cocoa-200 dark:border-cocoa-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-cocoa-50 dark:bg-cocoa-700 px-4 py-3 border-b border-cocoa-200 dark:border-cocoa-600">
        <h3 className="text-sm font-semibold text-cocoa-900 dark:text-white">
          📚 Layers ({layers.length})
        </h3>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-cocoa-200 dark:border-cocoa-600">
        <input
          type="text"
          placeholder="Search layers..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full px-2 py-1 text-sm rounded border border-cocoa-300 dark:border-cocoa-600 bg-white dark:bg-cocoa-800 text-cocoa-900 dark:text-white placeholder-cocoa-500 dark:placeholder-cocoa-400"
        />
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {filteredLayers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-cocoa-600 dark:text-cocoa-400 text-xs p-4 text-center">
            {searchText ? 'No layers match' : 'No layers'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredLayers.map((layer, idx) => {
              const color = getLayerColor(idx);
              const isExpanded = expandedIds.has(layer.id);

              return (
                <div
                  key={layer.id}
                  className="rounded border border-cocoa-200 dark:border-cocoa-600 bg-cocoa-50 dark:bg-cocoa-750 overflow-hidden"
                >
                  {/* Layer row */}
                  <div className="p-2 flex items-center gap-2">
                    {/* Color dot */}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />

                    {/* Visibility toggle */}
                    <button
                      onClick={() => onVisibilityChange(layer.id, !layer.visible)}
                      className="text-lg flex-shrink-0 hover:scale-110 transition"
                      title={layer.visible ? 'Hide' : 'Show'}
                    >
                      {layer.visible ? '👁️' : '👁️‍🗨️'}
                    </button>

                    {/* Layer name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-cocoa-900 dark:text-white truncate">
                        {layer.name}
                      </p>
                      {(layer.type || layer.geometryType) && (
                        <div className="flex gap-1 mt-0.5">
                          {layer.type && (
                            <span
                              className="text-xs px-1 py-0.5 rounded text-white"
                              style={{ backgroundColor: color + '80' }}
                            >
                              {layer.type}
                            </span>
                          )}
                          {layer.geometryType && (
                            <span className="text-xs px-1 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {layer.geometryType}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={() => toggleExpanded(layer.id)}
                      className="text-xs text-cocoa-600 dark:text-cocoa-400 flex-shrink-0 px-1"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>

                    {/* Remove button */}
                    <button
                      onClick={() => onRemoveLayer(layer.id)}
                      className="text-xs px-1.5 py-0.5 rounded bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-800 transition flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Expanded controls */}
                  {isExpanded && (
                    <div className="px-3 py-2 border-t border-cocoa-200 dark:border-cocoa-600 bg-white dark:bg-cocoa-800 space-y-2">
                      {/* Opacity slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-cocoa-900 dark:text-white">
                            Opacity
                          </label>
                          <span className="text-xs text-cocoa-600 dark:text-cocoa-400">
                            {Math.round(layer.opacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(layer.opacity * 100)}
                          onChange={(e) => onOpacityChange(layer.id, parseInt(e.target.value) / 100)}
                          className="w-full h-1.5 rounded cursor-pointer"
                          style={{
                            backgroundColor: '#d4d4d8',
                            accentColor: color,
                          }}
                        />
                      </div>

                      {/* Layer details */}
                      <div className="text-xs space-y-1 pt-1 border-t border-cocoa-200 dark:border-cocoa-600">
                        <div className="flex justify-between">
                          <span className="text-cocoa-600 dark:text-cocoa-400">ID:</span>
                          <span className="font-mono text-cocoa-900 dark:text-white">{layer.id}</span>
                        </div>
                        {layer.type && (
                          <div className="flex justify-between">
                            <span className="text-cocoa-600 dark:text-cocoa-400">Type:</span>
                            <span className="text-cocoa-900 dark:text-white">{layer.type}</span>
                          </div>
                        )}
                        {layer.geometryType && (
                          <div className="flex justify-between">
                            <span className="text-cocoa-600 dark:text-cocoa-400">Geometry:</span>
                            <span className="text-cocoa-900 dark:text-white">{layer.geometryType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-cocoa-600 dark:text-cocoa-400 px-3 py-2 border-t border-cocoa-200 dark:border-cocoa-600 bg-cocoa-50 dark:bg-cocoa-700">
        {filteredLayers.length > 0 ? (
          `Showing ${filteredLayers.length} of ${layers.length}`
        ) : (
          'No layers'
        )}
      </div>
    </div>
  );
}
