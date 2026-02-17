'use client';

import { useState, useEffect } from 'react';

interface Party {
  id: string;
  name: string;
  abbr: string;
}

interface Precinct {
  id: string;
  number: string;
  name?: string;
}

export interface PeopleFilters {
  search: string;
  partyId?: string;
  precinctId?: string;
  vbmStatus?: string;
  gender?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  city?: string;
  zipCode?: string;
  registrationDateFrom?: string;
  registrationDateTo?: string;
}

interface PeopleSearchProps {
  filters: PeopleFilters;
  onFiltersChange: (filters: PeopleFilters) => void;
  onClearFilters: () => void;
}

export default function PeopleSearch({ filters, onFiltersChange, onClearFilters }: PeopleSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [precincts, setPrecincts] = useState<Precinct[]>([]);
  const [loading, setLoading] = useState(false);

  // Load parties and precincts for filters
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Load parties
        const partiesRes = await fetch('/api/v1/parties', { headers });
        if (partiesRes.ok) {
          const partiesData = await partiesRes.json();
          setParties(partiesData.parties || []);
        }

        // Load precincts
        const precinctsRes = await fetch('/api/v1/precincts', { headers });
        if (precinctsRes.ok) {
          const precinctsData = await precinctsRes.json();
          setPrecincts(precinctsData.precincts || []);
        }
      } catch (err) {
        console.error('Error loading filter options:', err);
      } finally {
        setLoading(false);
      }
    };

    if (showAdvanced && parties.length === 0) {
      loadFilterOptions();
    }
  }, [showAdvanced, parties.length]);

  const updateFilter = (key: keyof PeopleFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = () => {
    return Object.keys(filters).some(key => {
      if (key === 'search') return false; // Search is always visible
      const value = filters[key as keyof PeopleFilters];
      return value !== undefined && value !== '' && value !== null;
    });
  };

  return (
    <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700">
      {/* Basic Search */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 Search name, email, or phone..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showAdvanced || hasActiveFilters()
              ? 'bg-cinnamon-600 text-white hover:bg-cinnamon-700'
              : 'border border-cocoa-300 dark:border-cocoa-600 text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700'
          }`}
        >
          {showAdvanced ? '▲ Hide Filters' : '▼ More Filters'}
          {hasActiveFilters() && !showAdvanced && ' (Active)'}
        </button>
        <button
          onClick={onClearFilters}
          className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium transition-colors"
        >
          🔄 Clear All
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-cocoa-200 dark:border-cocoa-700 pt-4 mt-2">
          <h3 className="text-sm font-semibold text-cocoa-700 dark:text-cocoa-300 mb-3">Advanced Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Party Filter */}
            <div>
              <label className="block text-xs font-medium text-cocoa-600 dark:text-cocoa-400 mb-1">
                Political Party
              </label>
              <select
                value={filters.partyId || ''}
                onChange={(e) => updateFilter('partyId', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                disabled={loading}
              >
                <option value="">All Parties</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name} ({party.abbr})
                  </option>
                ))}
              </select>
            </div>

            {/* Precinct Filter */}
            <div>
              <label className="block text-xs font-medium text-cocoa-600 dark:text-cocoa-400 mb-1">
                Precinct
              </label>
              <select
                value={filters.precinctId || ''}
                onChange={(e) => updateFilter('precinctId', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                disabled={loading}
              >
                <option value="">All Precincts</option>
                {precincts.map((precinct) => (
                  <option key={precinct.id} value={precinct.id}>
                    {precinct.number}{precinct.name ? ` - ${precinct.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* VBM Status Filter */}
            <div>
              <label className="block text-xs font-medium text-cocoa-600 dark:text-cocoa-400 mb-1">
                Vote by Mail Status
              </label>
              <select
                value={filters.vbmStatus || ''}
                onChange={(e) => updateFilter('vbmStatus', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
              >
                <option value="">All Statuses</option>
                <option value="Permanent VBM">Permanent VBM</option>
                <option value="Conditional">Conditional</option>
                <option value="None">No VBM</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-xs font-medium text-cocoa-600 dark:text-cocoa-400 mb-1">
                Gender
              </label>
              <select
                value={filters.gender || ''}
                onChange={(e) => updateFilter('gender', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
              >
                <option value="">All</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="U">Unspecified</option>
                <option value="X">Non-Binary</option>
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-xs font-medium text-cocoa-600 dark:text-cocoa-400 mb-1">
                City
              </label>
              <input
                type="text"
                placeholder="City name..."
                value={filters.city || ''}
                onChange={(e) => updateFilter('city', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400"
              />
            </div>

            {/* Zip Code Filter */}
            <div>
              <label className="block text-xs font-medium text-cocoa-600 dark:text-cocoa-400 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                placeholder="12345"
                value={filters.zipCode || ''}
                onChange={(e) => updateFilter('zipCode', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400"
              />
            </div>

            {/* Registration Date From */}
            <div>
              <label className="block text-xs font-medium text-cocoa-600 dark:text-cocoa-400 mb-1">
                Registered After
              </label>
              <input
                type="date"
                value={filters.registrationDateFrom || ''}
                onChange={(e) => updateFilter('registrationDateFrom', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
              />
            </div>

            {/* Registration Date To */}
            <div>
              <label className="block text-xs font-medium text-cocoa-600 dark:text-cocoa-400 mb-1">
                Registered Before
              </label>
              <input
                type="date"
                value={filters.registrationDateTo || ''}
                onChange={(e) => updateFilter('registrationDateTo', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
              />
            </div>

            {/* Has Email Checkbox */}
            <div className="flex items-center pt-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasEmail || false}
                  onChange={(e) => updateFilter('hasEmail', e.target.checked || undefined)}
                  className="mr-2 w-4 h-4 text-cinnamon-600 border-cocoa-300 dark:border-cocoa-600 rounded focus:ring-cinnamon-500"
                />
                <span className="text-sm text-cocoa-700 dark:text-cocoa-300">Has Email</span>
              </label>
            </div>

            {/* Has Phone Checkbox */}
            <div className="flex items-center pt-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasPhone || false}
                  onChange={(e) => updateFilter('hasPhone', e.target.checked || undefined)}
                  className="mr-2 w-4 h-4 text-cinnamon-600 border-cocoa-300 dark:border-cocoa-600 rounded focus:ring-cinnamon-500"
                />
                <span className="text-sm text-cocoa-700 dark:text-cocoa-300">Has Phone</span>
              </label>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters() && (
            <div className="mt-4 pt-4 border-t border-cocoa-200 dark:border-cocoa-700">
              <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mb-2">
                <strong>Active Filters:</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {filters.partyId && (
                  <span className="px-2 py-1 bg-cinnamon-100 dark:bg-cinnamon-900/30 text-cinnamon-800 dark:text-cinnamon-300 rounded text-xs">
                    Party: {parties.find(p => p.id === filters.partyId)?.abbr || filters.partyId}
                  </span>
                )}
                {filters.precinctId && (
                  <span className="px-2 py-1 bg-cinnamon-100 dark:bg-cinnamon-900/30 text-cinnamon-800 dark:text-cinnamon-300 rounded text-xs">
                    Precinct: {precincts.find(p => p.id === filters.precinctId)?.number || filters.precinctId}
                  </span>
                )}
                {filters.vbmStatus && (
                  <span className="px-2 py-1 bg-cinnamon-100 dark:bg-cinnamon-900/30 text-cinnamon-800 dark:text-cinnamon-300 rounded text-xs">
                    VBM: {filters.vbmStatus}
                  </span>
                )}
                {filters.gender && (
                  <span className="px-2 py-1 bg-cinnamon-100 dark:bg-cinnamon-900/30 text-cinnamon-800 dark:text-cinnamon-300 rounded text-xs">
                    Gender: {filters.gender}
                  </span>
                )}
                {filters.city && (
                  <span className="px-2 py-1 bg-cinnamon-100 dark:bg-cinnamon-900/30 text-cinnamon-800 dark:text-cinnamon-300 rounded text-xs">
                    City: {filters.city}
                  </span>
                )}
                {filters.zipCode && (
                  <span className="px-2 py-1 bg-cinnamon-100 dark:bg-cinnamon-900/30 text-cinnamon-800 dark:text-cinnamon-300 rounded text-xs">
                    Zip: {filters.zipCode}
                  </span>
                )}
                {filters.hasEmail && (
                  <span className="px-2 py-1 bg-cinnamon-100 dark:bg-cinnamon-900/30 text-cinnamon-800 dark:text-cinnamon-300 rounded text-xs">
                    ✉️ Has Email
                  </span>
                )}
                {filters.hasPhone && (
                  <span className="px-2 py-1 bg-cinnamon-100 dark:bg-cinnamon-900/30 text-cinnamon-800 dark:text-cinnamon-300 rounded text-xs">
                    📱 Has Phone
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
