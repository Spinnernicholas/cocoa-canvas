'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ImportFormat {
  id: string;
  name: string;
  description: string;
  supportedExtensions: string[];
  supportsIncremental: boolean;
}

interface PeopleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PeopleImportModal({ isOpen, onClose, onSuccess }: PeopleImportModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [importKind, setImportKind] = useState<'voter' | 'people' | ''>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFormats, setImportFormats] = useState<ImportFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [importType, setImportType] = useState<'full' | 'incremental'>('full');
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  // Fetch available import formats when modal opens
  useEffect(() => {
    if (isOpen && step === 2 && importKind === 'voter' && importFormats.length === 0) {
      const fetchFormats = async () => {
        try {
          setLoadingFormats(true);
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/v1/voters/import', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          if (!response.ok) {
            if (response.status === 401) {
              localStorage.removeItem('user');
              localStorage.removeItem('authToken');
              router.push('/login');
              return;
            }
            setError('Failed to load import formats');
            return;
          }
          const data = await response.json();
          setImportFormats(data.formats || []);
          // Set default format to simple_csv
          if (data.formats && data.formats.length > 0) {
            const simpleFormat = data.formats.find((f: ImportFormat) => f.id === 'simple_csv');
            setSelectedFormat(simpleFormat?.id || data.formats[0].id);
          } else {
            setSelectedFormat('');
          }
        } catch (err) {
          console.error('Error fetching formats:', err);
          setError('Failed to load import formats');
        } finally {
          setLoadingFormats(false);
        }
      };
      fetchFormats();
    }
  }, [isOpen, step, importKind, importFormats.length]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setImportKind('');
      setImportFile(null);
      setImportType('full');
      setError('');
      setIsDragging(false);
    }
  }, [isOpen]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file extension if format is selected
      if (selectedFormat) {
        const format = importFormats.find(f => f.id === selectedFormat);
        if (format) {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          if (format.supportedExtensions.includes(ext)) {
            setImportFile(file);
            setError('');
          } else {
            setError(`Invalid file type. Expected: ${format.supportedExtensions.join(', ')}`);
          }
        }
      } else {
        setImportFile(file);
        setError('');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file extension if format is selected
      if (selectedFormat) {
        const format = importFormats.find(f => f.id === selectedFormat);
        if (format) {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          if (format.supportedExtensions.includes(ext)) {
            setImportFile(file);
            setError('');
          } else {
            setError(`Invalid file type. Expected: ${format.supportedExtensions.join(', ')}`);
          }
        }
      } else {
        setImportFile(file);
        setError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importKind !== 'voter') {
      setError('People import is not available yet.');
      return;
    }
    if (!importFile || !selectedFormat) return;

    setImporting(true);
    setError('');
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('format', selectedFormat);
    formData.append('importType', importType);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/voters/import', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok || response.status === 202) {
        // Job created successfully
        const jobId = data.jobId;
        console.log('[Import] Job created:', jobId);
        
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        
        // Redirect to job queue page to monitor progress
        setTimeout(() => {
          router.push(`/jobs/${jobId}`);
        }, 500);
      } else {
        if (response.status === 401) {
          // Authentication failed - redirect to login
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          router.push('/login');
          return;
        }
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Error uploading file. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const selectedFormatData = importFormats.find(f => f.id === selectedFormat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">📥 Import People</h2>
          <button
            onClick={onClose}
            disabled={importing}
            className="text-cocoa-500 hover:text-cocoa-700 dark:text-cocoa-400 dark:hover:text-cocoa-200 text-2xl leading-none disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-6 text-sm">
          <div className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-cinnamon-600 text-white' : 'bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-700 dark:text-cocoa-300'}`}>
            Step 1: Import Type
          </div>
          <div className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-cinnamon-600 text-white' : 'bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-700 dark:text-cocoa-300'}`}>
            Step 2: File + Format
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-2">
                  What kind of import is this?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setImportKind('voter');
                      setError('');
                    }}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      importKind === 'voter'
                        ? 'border-cinnamon-500 bg-cinnamon-50 dark:bg-cinnamon-900/20'
                        : 'border-cocoa-300 dark:border-cocoa-600 hover:border-cocoa-400 dark:hover:border-cocoa-500'
                    }`}
                  >
                    <div className="text-lg font-semibold text-cocoa-900 dark:text-cream-50">🗳️ Voter Import</div>
                    <div className="text-sm text-cocoa-600 dark:text-cocoa-400">Available now</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportKind('people');
                      setError('');
                    }}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      importKind === 'people'
                        ? 'border-cinnamon-500 bg-cinnamon-50 dark:bg-cinnamon-900/20'
                        : 'border-cocoa-300 dark:border-cocoa-600 hover:border-cocoa-400 dark:hover:border-cocoa-500'
                    }`}
                  >
                    <div className="text-lg font-semibold text-cocoa-900 dark:text-cream-50">👥 People Import</div>
                    <div className="text-sm text-cocoa-600 dark:text-cocoa-400">Coming soon</div>
                  </button>
                </div>
              </div>

              {importKind === 'people' && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                  People import is not available yet. Choose voter import to continue.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={importing}
                  className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (importKind === 'voter') {
                      setStep(2);
                    } else {
                      setError('People import is not available yet.');
                    }
                  }}
                  disabled={importKind !== 'voter'}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white rounded-lg hover:from-cocoa-700 hover:to-cinnamon-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {loadingFormats ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading formats...</p>
                </div>
              ) : (
                <>
                  {/* Format Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-2">
                      Import Format
                    </label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => {
                        setSelectedFormat(e.target.value);
                        setImportFile(null);
                        setError('');
                      }}
                      className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                      disabled={importing}
                    >
                      {importFormats.length === 0 && (
                        <option value="">No formats available</option>
                      )}
                      {importFormats.map((format) => (
                        <option key={format.id} value={format.id}>
                          {format.name}
                        </option>
                      ))}
                    </select>
                    {selectedFormatData && (
                      <p className="text-xs text-cocoa-500 dark:text-cocoa-400 mt-1">
                        {selectedFormatData.description}
                      </p>
                    )}
                  </div>

                  {/* File Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-2">
                      Voter File
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragging
                          ? 'border-cinnamon-500 bg-cinnamon-50 dark:bg-cinnamon-900/20'
                          : 'border-cocoa-300 dark:border-cocoa-600 hover:border-cocoa-400 dark:hover:border-cocoa-500'
                      } ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        accept={selectedFormatData?.supportedExtensions.join(',') || '*'}
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-input"
                        disabled={importing}
                      />
                      <label 
                        htmlFor="file-input" 
                        className={`cursor-pointer block ${importing ? 'cursor-not-allowed' : ''}`}
                        style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                      >
                        {importFile ? (
                          <div className="space-y-2">
                            <div className="text-4xl">📄</div>
                            <p className="text-cocoa-900 dark:text-cream-50 font-medium">
                              {importFile.name}
                            </p>
                            <p className="text-xs text-cocoa-500 dark:text-cocoa-400">
                              {(importFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {!importing && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setImportFile(null);
                                }}
                                className="text-sm text-red-600 dark:text-red-400 hover:underline"
                              >
                                Remove file
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-4xl">
                              {isDragging ? '📥' : '📂'}
                            </div>
                            <p className="text-cocoa-600 dark:text-cocoa-300">
                              {isDragging ? 'Drop file here' : 'Click to select or drag file here'}
                            </p>
                            {selectedFormatData && (
                              <p className="text-xs text-cocoa-500 dark:text-cocoa-400">
                                Accepted: {selectedFormatData.supportedExtensions.join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Import Progress */}
                  {importing && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
                      <div className="flex items-center justify-center">
                        <div className="inline-block w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mr-3"></div>
                        <span className="text-blue-800 dark:text-blue-300 font-medium">Processing import...</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={importing}
                      className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!importFile || !selectedFormat || importing}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white rounded-lg hover:from-cocoa-700 hover:to-cinnamon-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      {importing ? 'Importing...' : '📥 Start Import'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
