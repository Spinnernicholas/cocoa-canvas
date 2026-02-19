'use client';

import { useState } from 'react';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportRemoteDatasetRequest) => Promise<void>;
  layerName: string;
  serviceUrl: string;
  layerId: number;
  datasetTypes: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

interface ImportRemoteDatasetRequest {
  remoteDatasetId?: string;
  catalogName: string;
  catalogDescription?: string;
  datasetTypeId: string;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
}

export function ImportToCatalogDialog({
  isOpen,
  onClose,
  onImport,
  layerName,
  serviceUrl,
  layerId,
  datasetTypes,
  isLoading = false,
}: ImportDialogProps) {
  const [catalogName, setCatalogName] = useState(layerName);
  const [description, setDescription] = useState('');
  const [datasetTypeId, setDatasetTypeId] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!catalogName.trim()) {
      setError('Catalog name is required');
      return;
    }

    if (!datasetTypeId) {
      setError('Dataset type is required');
      return;
    }

    try {
      await onImport({
        catalogName: catalogName.trim(),
        catalogDescription: description.trim() || undefined,
        datasetTypeId,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
        category: category || undefined,
        isPublic,
      });

      // Reset form
      setCatalogName(layerName);
      setDescription('');
      setDatasetTypeId('');
      setTags('');
      setCategory('');
      setIsPublic(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cocoa-900 dark:text-white">
            Import Layer to Catalog
          </h2>
          <button
            onClick={onClose}
            className="text-cocoa-500 dark:text-cocoa-400 hover:text-cocoa-700 dark:hover:text-cocoa-300"
          >
            ✕
          </button>
        </div>

        {/* Source Information */}
        <div className="bg-cocoa-50 dark:bg-cocoa-700 rounded p-4 mb-6">
          <p className="text-sm text-cocoa-700 dark:text-cocoa-300">
            <strong>Source Layer:</strong> {layerName}
          </p>
          <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-2 break-all">
            <strong>Service:</strong> {serviceUrl}
          </p>
          <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-2">
            <strong>Layer ID:</strong> {layerId}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded p-3 mb-4 text-red-800 dark:text-red-100 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Catalog Name */}
          <div>
            <label className="block text-sm font-semibold text-cocoa-900 dark:text-cocoa-100 mb-2">
              Catalog Dataset Name *
            </label>
            <input
              type="text"
              value={catalogName}
              onChange={(e) => setCatalogName(e.target.value)}
              placeholder="e.g., 'County Assessment Parcels'"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cocoa-500 disabled:bg-cocoa-100 dark:disabled:bg-cocoa-600"
              required
            />
            <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1">
              Name for this dataset in your catalog
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-cocoa-900 dark:text-cocoa-100 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description about this dataset..."
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cocoa-500 disabled:bg-cocoa-100 dark:disabled:bg-cocoa-600"
            />
          </div>

          {/* Dataset Type */}
          <div>
            <label className="block text-sm font-semibold text-cocoa-900 dark:text-cocoa-100 mb-2">
              Dataset Type *
            </label>
            <select
              value={datasetTypeId}
              onChange={(e) => setDatasetTypeId(e.target.value)}
              disabled={isLoading || datasetTypes.length === 0}
              className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cocoa-500 disabled:bg-cocoa-100 dark:disabled:bg-cocoa-600"
              required
            >
              <option value="">Select a type...</option>
              {datasetTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1">
              Category for organizing this dataset
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-cocoa-900 dark:text-cocoa-100 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., 'parcel, county, assessment' (comma-separated)"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cocoa-500 disabled:bg-cocoa-100 dark:disabled:bg-cocoa-600"
            />
            <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1">
              Comma-separated tags for searchability
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-cocoa-900 dark:text-cocoa-100 mb-2">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., 'Property', 'Political', 'Demographics'"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cocoa-500 disabled:bg-cocoa-100 dark:disabled:bg-cocoa-600"
            />
          </div>

          {/* Public Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-semibold text-cocoa-900 dark:text-cocoa-100">
                Make this dataset public
              </span>
            </label>
            <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1">
              If checked, this dataset will be visible to other users
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-cocoa-200 dark:border-cocoa-600">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-800 dark:text-cocoa-200 hover:bg-cocoa-200 dark:hover:bg-cocoa-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded bg-cocoa-600 dark:bg-cocoa-700 text-white hover:bg-cocoa-700 dark:hover:bg-cocoa-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Importing...' : 'Import to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
