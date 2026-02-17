'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';
import PeopleSearch, { PeopleFilters } from '@/components/PeopleSearch';
import PeopleImportModal from '@/components/PeopleImportModal';
import PeopleDetailModal from '@/components/PeopleDetailModal';

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

export default function PeoplePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter
  const buildDefaultFilters = (): PeopleFilters => ({
    search: '',
    partyId: '',
    precinctId: '',
    vbmStatus: '',
    gender: '',
    city: '',
    zipCode: '',
    registrationDateFrom: '',
    registrationDateTo: '',
    hasEmail: undefined,
    hasPhone: undefined,
  });
  const [filters, setFilters] = useState<PeopleFilters>(buildDefaultFilters);
  const [viewFilter, setViewFilter] = useState<'all' | 'voters' | 'volunteers' | 'donors'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

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
  const fetchPeople = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        filter: viewFilter,
      });

      // Add filters from PeopleSearch component
      if (filters.search) params.append('search', filters.search);
      if (filters.partyId) params.append('partyId', filters.partyId);
      if (filters.precinctId) params.append('precinctId', filters.precinctId);
      if (filters.vbmStatus) params.append('vbmStatus', filters.vbmStatus);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.city) params.append('city', filters.city);
      if (filters.zipCode) params.append('zipCode', filters.zipCode);
      if (filters.registrationDateFrom) params.append('registrationDateFrom', filters.registrationDateFrom);
      if (filters.registrationDateTo) params.append('registrationDateTo', filters.registrationDateTo);
      if (filters.hasEmail !== undefined) params.append('hasEmail', filters.hasEmail.toString());
      if (filters.hasPhone !== undefined) params.append('hasPhone', filters.hasPhone.toString());

      const response = await fetch(`/api/v1/people?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        if (response.status === 401) {
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

  useEffect(() => {
    fetchPeople();
  }, [user, page, filters, viewFilter]);

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
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40">
        <Marshmallow size={40} animationDuration="3.8s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40">
        <Marshmallow size={42} animationDuration="4.5s" animationDelay="1s" />
      </div>
      <div className="hidden dark:block fixed top-[55%] left-[12%] opacity-40">
        <Marshmallow size={43} animationDuration="4.1s" animationDelay="0.6s" />
      </div>
      <div className="hidden dark:block fixed top-[15%] right-[15%] opacity-40">
        <Marshmallow size={44} animationDuration="3.7s" animationDelay="1.4s" />
      </div>
      <div className="hidden dark:block fixed bottom-[40%] left-[8%] opacity-40">
        <Marshmallow size={45} animationDuration="4.3s" animationDelay="0.8s" />
      </div>
      <div className="hidden dark:block fixed bottom-[25%] right-[12%] opacity-40">
        <Marshmallow size={41} animationDuration="3.9s" animationDelay="1.7s" />
      </div>
      <div className="hidden dark:block fixed bottom-[60%] right-[7%] opacity-40">
        <Marshmallow size={42} animationDuration="4.4s" animationDelay="1.2s" />
      </div>

      <Header userName={user.name} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50">👥 People</h1>
            <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">
              {total} {viewFilter === 'voters' ? 'voters' : viewFilter === 'volunteers' ? 'volunteers' : viewFilter === 'donors' ? 'donors' : 'people'} in database
            </p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white rounded-lg hover:from-cocoa-700 hover:to-cinnamon-700 font-medium transition-colors"
          >
            📥 Import People
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
        <PeopleSearch
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
          onClearFilters={() => {
            setFilters(buildDefaultFilters());
            setPage(1);
          }}
        />

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
                {filters.search ? 'Try adjusting your filters' : 'Import people to get started'}
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
                      onClick={() => setSelectedPersonId(person.id)}
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
      <PeopleImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchPeople}
      />

      {/* Detail Modal */}
      {selectedPersonId && (
        <PeopleDetailModal
          personId={selectedPersonId}
          isOpen={!!selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
          onUpdate={fetchPeople}
        />
      )}
    </div>
  );
}
