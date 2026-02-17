'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

interface Address {
  id: string;
  location: {
    name: string;
  };
  fullAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isPrimary: boolean;
}

interface Phone {
  id: string;
  location: {
    name: string;
  };
  number: string;
  isPrimary: boolean;
}

interface Email {
  id: string;
  location: {
    name: string;
  };
  address: string;
  isPrimary: boolean;
}

interface Voter {
  id: string;
  party?: { name: string; abbr: string };
  precinct?: { name: string };
}

interface Volunteer {
  id: string;
  status: string;
  skills?: string;
  availability?: string;
}

interface Donor {
  id: string;
  status: string;
  totalContributed: number;
  lastContributionDate?: string;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  addresses: Address[];
  phones: Phone[];
  emails: Email[];
  contactLogs: any[];
  voter?: Voter | null;
  volunteer?: Volunteer | null;
  donor?: Donor | null;
  createdAt: string;
}

interface ImportFormat {
  id: string;
  name: string;
  description: string;
  supportedExtensions: string[];
  supportsIncremental: boolean;
}

export default function PeoplePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'voters' | 'volunteers' | 'donors'>('all'); // View filter for person types
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  // Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFormats, setImportFormats] = useState<ImportFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [importType, setImportType] = useState<'full' | 'incremental'>('full');
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState('');

  // Load user
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');

    if (!userStr || !token) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  // Fetch people
  useEffect(() => {
    if (!user) return;

    const fetchPeople = async () => {
      try {
        setLoading(true);
        setError(''); // Clear any previous errors
        const token = localStorage.getItem('authToken');
        
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: ((page - 1) * limit).toString(),
          filter: viewFilter, // 'all' or 'voters'
        });

        if (searchQuery) {
          params.append('search', searchQuery);
        }

        const response = await fetch(`/api/v1/people?${params}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Authentication failed - redirect to login
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            router.push('/login');
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Failed to load people. Please try again.');
          setPeople([]);
          return;
        }

        const data = await response.json();
        setPeople(data.people || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Error fetching people:', err);
        setError('Network error. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPeople();
  }, [user, page, searchQuery, viewFilter, limit]);

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
            setImportError('');
          } else {
            setImportError(`Invalid file type. Expected: ${format.supportedExtensions.join(', ')}`);
          }
        }
      } else {
        setImportFile(file);
        setImportError('');
      }
    }
  };

  // Fetch available import formats when modal opens
  useEffect(() => {
    if (showImportModal && importFormats.length === 0) {
      const fetchFormats = async () => {
        try {
          setLoadingFormats(true);
          const response = await fetch('/api/v1/voters/import');
          if (response.ok) {
            const data = await response.json();
            setImportFormats(data.formats || []);
            // Set default format to simple_csv
            if (data.formats && data.formats.length > 0) {
              const simpleFormat = data.formats.find((f: ImportFormat) => f.id === 'simple_csv');
              setSelectedFormat(simpleFormat?.id || data.formats[0].id);
            }
          }
        } catch (err) {
          console.error('Error fetching formats:', err);
        } finally {
          setLoadingFormats(false);
        }
      };
      fetchFormats();
    }
  }, [showImportModal, importFormats.length]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !selectedFormat) return;

    setImporting(true);
    setImportError('');
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
        
        // Show success message
        setError('');
        setImportError('');
        setShowImportModal(false);
        setImportFile(null);
        setImportType('full');
        
        // Redirect to job queue page to monitor progress
        setTimeout(() => {
          router.push(`/jobs/${jobId}`);
        }, 1000);
      } else {
        if (response.status === 401) {
          // Authentication failed - redirect to login
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          router.push('/login');
          return;
        }
        setImportError(data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setImportError('Error uploading file');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper functions to extract contact info
  const getPersonName = (person: Person) => {
    const { firstName, lastName, middleName } = person;
    return middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
  };

  const getPrimaryEmail = (person: Person) => {
    return person.emails.find(e => e.isPrimary)?.address || null;
  };

  const getPrimaryPhone = (person: Person) => {
    return person.phones.find(p => p.isPrimary)?.number || null;
  };

  const getLatestContactLog = (person: Person) => {
    if (!person.contactLogs || person.contactLogs.length === 0) return null;
    const latest = person.contactLogs[0];
    return (
      <>
        <div>{formatDate(latest.createdAt)}</div>
        <div className="text-xs text-cocoa-500 dark:text-cocoa-400">{latest.method || 'N/A'}</div>
      </>
    );
  };

  const totalPages = Math.ceil(total / limit);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40 animate-bounce" style={{ animationDuration: '3.8s' }}>
        <Marshmallow size={44} />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1s' }}>
        <Marshmallow size={36} />
      </div>

      <Header userName={user.name} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50">👥 People</h1>
            <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">
              {total} {viewFilter === 'voters' ? 'voters' : 'people'} in database
            </p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white rounded-lg hover:from-cocoa-700 hover:to-cinnamon-700 font-medium transition-colors"
          >
            📥 Import Voters
          </button>
        </div>

        {/* View Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => {
              setViewFilter('all');
              setPage(1);
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              viewFilter === 'all'
                ? 'bg-cocoa-600 dark:bg-cinnamon-600 text-white'
                : 'bg-white dark:bg-cocoa-800 border border-cocoa-200 dark:border-cocoa-700 text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700'
            }`}
          >
            👥 All People
          </button>
          <button
            onClick={() => {
              setViewFilter('voters');
              setPage(1);
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              viewFilter === 'voters'
                ? 'bg-cocoa-600 dark:bg-cinnamon-600 text-white'
                : 'bg-white dark:bg-cocoa-800 border border-cocoa-200 dark:border-cocoa-700 text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700'
            }`}
          >
            🗳️ Voters Only
          </button>
          <button
            onClick={() => {
              setViewFilter('volunteers');
              setPage(1);
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              viewFilter === 'volunteers'
                ? 'bg-cocoa-600 dark:bg-cinnamon-600 text-white'
                : 'bg-white dark:bg-cocoa-800 border border-cocoa-200 dark:border-cocoa-700 text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700'
            }`}
          >
            🤝 Volunteers
          </button>
          <button
            onClick={() => {
              setViewFilter('donors');
              setPage(1);
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              viewFilter === 'donors'
                ? 'bg-cocoa-600 dark:bg-cinnamon-600 text-white'
                : 'bg-white dark:bg-cocoa-800 border border-cocoa-200 dark:border-cocoa-700 text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700'
            }`}
          >
            💰 Donors
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 mb-6 border border-cocoa-200 dark:border-cocoa-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search name, email, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400"
            />

            <button
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium transition-colors"
            >
              🔄 Clear Search
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* People Table */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading people...</p>
            </div>
          ) : people.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-cocoa-600 dark:text-cocoa-300 text-lg">No people found</p>
              <p className="text-cocoa-500 dark:text-cocoa-400 text-sm mt-1">
                {searchQuery ? 'Try adjusting search' : 'Import voters to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cocoa-200 dark:border-cocoa-700 bg-cocoa-50 dark:bg-cocoa-900/50">
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Email</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Phone</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Type</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Last Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cocoa-200 dark:divide-cocoa-700">
                  {people.map((person) => (
                    <tr
                      key={person.id}
                      className="hover:bg-cocoa-50 dark:hover:bg-cocoa-900/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/people/${person.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-cocoa-900 dark:text-cream-50">{getPersonName(person)}</td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">{getPrimaryEmail(person) || '—'}</td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">{getPrimaryPhone(person) || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {person.voter && (
                            <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              🗳️ Voter
                            </span>
                          )}
                          {person.volunteer && (
                            <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              🤝 Volunteer
                            </span>
                          )}
                          {person.donor && (
                            <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                              💰 Donor
                            </span>
                          )}
                          {!person.voter && !person.volunteer && !person.donor && (
                            <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
                              👤 Person
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">
                        {getLatestContactLog(person) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cocoa-50 dark:hover:bg-cocoa-700"
            >
              ← Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded ${
                    page === p
                      ? 'bg-cocoa-600 dark:bg-cinnamon-600 text-white'
                      : 'border border-cocoa-300 dark:border-cocoa-600 text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cocoa-50 dark:hover:bg-cocoa-700"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">📥 Import Voters</h2>
            
            {loadingFormats ? (
              <div className="py-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading formats...</p>
              </div>
            ) : (
              <form onSubmit={handleImport}>
                {/* Import Error Message */}
                {importError && (
                  <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
                    ⚠️ {importError}
                  </div>
                )}

                {/* Format Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-2">
                    Import Format
                  </label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => {
                      setSelectedFormat(e.target.value);
                      setImportFile(null); // Clear file when format changes
                    }}
                    className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                  >
                    {importFormats.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.name}
                      </option>
                    ))}
                  </select>
                  {selectedFormat && (
                    <p className="text-xs text-cocoa-500 dark:text-cocoa-400 mt-1">
                      {importFormats.find(f => f.id === selectedFormat)?.description}
                    </p>
                  )}
                </div>

                {/* Import Type */}
                {selectedFormat && importFormats.find(f => f.id === selectedFormat)?.supportsIncremental && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-2">
                      Import Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="importType"
                          value="full"
                          checked={importType === 'full'}
                          onChange={(e) => setImportType(e.target.value as 'full' | 'incremental')}
                          className="mr-2"
                        />
                        <span className="text-cocoa-700 dark:text-cocoa-300">
                          <strong>Full Import</strong> - Replace all voter data
                        </span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="importType"
                          value="incremental"
                          checked={importType === 'incremental'}
                          onChange={(e) => setImportType(e.target.value as 'full' | 'incremental')}
                          className="mr-2"
                        />
                        <span className="text-cocoa-700 dark:text-cocoa-300">
                          <strong>Incremental</strong> - Update existing voters only
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* File Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-2">
                    Voter File
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-cinnamon-500 bg-cinnamon-50 dark:bg-cinnamon-900/20'
                        : 'border-cocoa-300 dark:border-cocoa-600 hover:border-cocoa-400 dark:hover:border-cocoa-500'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept={selectedFormat ? importFormats.find(f => f.id === selectedFormat)?.supportedExtensions.join(',') : '*'}
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="file-input"
                    />
                    <label 
                      htmlFor="file-input" 
                      className="cursor-pointer block"
                      style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                    >
                      <p className="text-cocoa-600 dark:text-cocoa-300">
                        {importFile ? `📄 ${importFile.name}` : isDragging ? '📥 Drop file here' : '📂 Click or drag file here'}
                      </p>
                      {selectedFormat && (
                        <p className="text-xs text-cocoa-500 dark:text-cocoa-400 mt-1">
                          Accepted: {importFormats.find(f => f.id === selectedFormat)?.supportedExtensions.join(', ')}
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                {/* Import Stats */}
                {importing && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-center">
                      <div className="inline-block w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mr-3"></div>
                      <span className="text-blue-800 dark:text-blue-300 font-medium">Processing import...</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                      setImportType('full');
                      setImportError('');
                    }}
                    disabled={importing}
                    className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || !selectedFormat || importing}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white rounded-lg hover:from-cocoa-700 hover:to-cinnamon-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {importing ? 'Importing...' : '📥 Import'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
