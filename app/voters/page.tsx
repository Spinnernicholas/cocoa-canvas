'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

interface Voter {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactStatus: string;
  lastContactDate?: string;
  lastContactMethod?: string;
  createdAt: string;
}

export default function VotersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  // Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

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

  // Fetch voters
  useEffect(() => {
    if (!user) return;

    const fetchVoters = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: ((page - 1) * limit).toString(),
        });

        if (searchQuery) {
          params.append('search', searchQuery);
        }

        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const response = await fetch(`/api/v1/voters?${params}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          setError('Failed to fetch voters');
          setVoters([]);
          return;
        }

        const data = await response.json();
        setVoters(data.voters || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Error fetching voters:', err);
        setError('Error loading voters');
      } finally {
        setLoading(false);
      }
    };

    fetchVoters();
  }, [user, page, searchQuery, statusFilter, limit]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/voters/import', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setShowImportModal(false);
        setImportFile(null);
        setPage(1);
        // Refresh voters list
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Error uploading file');
    } finally {
      setImporting(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'contacted':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'attempted':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'pending':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'refused':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'unreachable':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-cocoa-100 dark:bg-cocoa-900/30 text-cocoa-800 dark:text-cocoa-300';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'contacted':
        return '✅';
      case 'attempted':
        return '⏳';
      case 'pending':
        return '📋';
      case 'refused':
        return '❌';
      case 'unreachable':
        return '📵';
      default:
        return '📊';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50">👥 Voters</h1>
            <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">{total} voters in database</p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white rounded-lg hover:from-cocoa-700 hover:to-cinnamon-700 font-medium transition-colors"
          >
            📥 Import Voters
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
            
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="attempted">Attempted</option>
              <option value="contacted">Contacted</option>
              <option value="refused">Refused</option>
              <option value="unreachable">Unreachable</option>
            </select>

            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPage(1);
              }}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium transition-colors"
            >
              🔄 Clear Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Voters Table */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading voters...</p>
            </div>
          ) : voters.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-cocoa-600 dark:text-cocoa-300 text-lg">No voters found</p>
              <p className="text-cocoa-500 dark:text-cocoa-400 text-sm mt-1">
                {searchQuery || statusFilter !== 'all' ? 'Try adjusting filters' : 'Import voters to get started'}
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
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Last Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cocoa-200 dark:divide-cocoa-700">
                  {voters.map((voter) => (
                    <tr
                      key={voter.id}
                      className="hover:bg-cocoa-50 dark:hover:bg-cocoa-900/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/voters/${voter.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-cocoa-900 dark:text-cream-50">{voter.name}</td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">{voter.email || '—'}</td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">{voter.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(voter.contactStatus)}`}>
                          {getStatusEmoji(voter.contactStatus)} {voter.contactStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">
                        {voter.lastContactDate ? (
                          <>
                            <div>{formatDate(voter.lastContactDate)}</div>
                            <div className="text-xs text-cocoa-500 dark:text-cocoa-400">{voter.lastContactMethod || 'N/A'}</div>
                          </>
                        ) : (
                          '—'
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">Import Voters</h2>
            
            <form onSubmit={handleImport}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-2">
                  CSV File
                </label>
                <div className="border-2 border-dashed border-cocoa-300 dark:border-cocoa-600 rounded-lg p-6 text-center cursor-pointer hover:border-cocoa-400 dark:hover:border-cocoa-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <p className="text-cocoa-600 dark:text-cocoa-300">
                      {importFile ? importFile.name : 'Click or drag CSV file here'}
                    </p>
                    <p className="text-xs text-cocoa-500 dark:text-cocoa-400 mt-1">
                      Columns: name, email, phone, address (optional)
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importing}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white rounded-lg hover:from-cocoa-700 hover:to-cinnamon-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
