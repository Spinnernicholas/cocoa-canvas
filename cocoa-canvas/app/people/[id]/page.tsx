'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

interface ContactLog {
  id: string;
  contactType?: string;
  method?: string;
  outcome?: string;
  notes?: string;
  followUpNeeded: boolean;
  followUpDate?: string;
  createdAt: string;
}

interface Address {
  id: string;
  location: {
    id: string;
    name: string;
  };
  houseNumber?: string;
  preDirection?: string;
  streetName?: string;
  streetSuffix?: string;
  postDirection?: string;
  unitAbbr?: string;
  unitNumber?: string;
  fullAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isPrimary: boolean;
  isVerified: boolean;
}

interface Phone {
  id: string;
  location: {
    id: string;
    name: string;
  };
  number: string;
  isPrimary: boolean;
  isVerified: boolean;
}

interface Email {
  id: string;
  location: {
    id: string;
    name: string;
  };
  address: string;
  isPrimary: boolean;
  isVerified: boolean;
}

interface Voter {
  id: string;
  contactStatus: string;
  lastContactDate?: string;
  lastContactMethod?: string;
  registrationDate?: string;
  registrationNumber?: string;
  externalId?: string;
  externalSource?: string;
  vbmStatus?: string;
  precinctPortion?: string;
  party?: {
    name: string;
    abbr: string;
  };
  precinct?: {
    name: string;
  };
}

interface Volunteer {
  id: string;
  status: string;
  skills?: string;
  availability?: string;
  hoursContributed: number;
  lastVolunteerDate?: string;
}

interface Donor {
  id: string;
  totalContributed: number;
  donorTier?: string;
  lastDonationDate?: string;
  lastDonationAmount?: number;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  notes?: string;
  addresses: Address[];
  phones: Phone[];
  emails: Email[];
  contactLogs: ContactLog[];
  voter?: Voter | null;
  volunteer?: Volunteer | null;
  donor?: Donor | null;
  createdAt: string;
}

export default function PersonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const personId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    notes: '',
  });

  // Contact log state
  const [showLogModal, setShowLogModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    contactType: 'call',
    outcome: 'contacted',
    notes: '',
    followUpNeeded: false,
    followUpDate: '',
  });

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
      router.push('/login');
    }
  }, [router]);

  // Fetch person
  useEffect(() => {
    if (!user || !personId) return;

    const fetchPerson = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/v1/people/${personId}`, {
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
          setError('Failed to load person');
          return;
        }

        const data = await response.json();
        setPerson(data);
        setFormData({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || '',
          notes: data.notes || '',
        });
      } catch (err) {
        console.error('Error fetching person:', err);
        setError('Error loading person');
      } finally {
        setLoading(false);
      }
    };

    fetchPerson();
  }, [user, personId, router]);

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/people/${personId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Authentication failed - redirect to login
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          router.push('/login');
          return;
        }
        setError('Failed to save person');
        return;
      }

      const updated = await response.json();
      setPerson(updated);
      setEditing(false);
    } catch (err) {
      console.error('Error saving person:', err);
      setError('Error saving person');
    }
  };

  const handleLogContact = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/people/${personId}/contact-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Authentication failed - redirect to login
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          router.push('/login');
          return;
        }
        setError('Failed to log contact');
        return;
      }

      setShowLogModal(false);
      setContactForm({
        contactType: 'call',
        outcome: 'contacted',
        notes: '',
        followUpNeeded: false,
        followUpDate: '',
      });
      
      // Refresh person data
      const fetchResponse = await fetch(`/api/v1/people/${personId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const updated = await fetchResponse.json();
      setPerson(updated);
    } catch (err) {
      console.error('Error logging contact:', err);
      setError('Error logging contact');
    }
  };

  const handleDeletePerson = async () => {
    if (!confirm('Are you sure you want to delete this person?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/people/${personId}`, {
        method: 'DELETE',
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
        setError('Failed to delete person');
        return;
      }

      router.push('/people');
    } catch (err) {
      console.error('Error deleting person:', err);
      setError('Error deleting person');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper functions to extract contact info
  const getPersonName = () => {
    if (!person) return '';
    const { firstName, lastName, middleName } = person;
    return middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
  };

  const getPrimaryEmail = () => {
    if (!person) return null;
    return person.emails.find(e => e.isPrimary)?.address || null;
  };

  const getPrimaryPhone = () => {
    if (!person) return null;
    return person.phones.find(p => p.isPrimary)?.number || null;
  };

  const getPrimaryAddress = () => {
    if (!person) return null;
    const addressInfo = person.addresses.find(a => a.isPrimary);
    if (!addressInfo) return null;
    return formatFullAddressLines(addressInfo).join(', ');
  };

  const getResidenceAddress = () => {
    if (!person) return null;
    // Look for address with location name "Residence"
    const residence = person.addresses.find(a => 
      a.location?.name?.toLowerCase().includes('residence')
    ) || person.addresses.find(a => a.isPrimary);
    return residence;
  };

  const buildCityStateZip = (address: Address) => {
    const city = address.city?.trim();
    const state = address.state?.trim();
    const zip = address.zipCode?.trim();
    const parts: string[] = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    let line = parts.join(', ');
    if (zip) {
      line = line ? `${line} ${zip}` : zip;
    }
    return line;
  };

  const buildStreetLine = (address: Address) => {
    const streetParts = [];
    if (address.houseNumber) streetParts.push(address.houseNumber);
    if (address.preDirection) streetParts.push(address.preDirection);
    if (address.streetName) streetParts.push(address.streetName);
    if (address.streetSuffix) streetParts.push(address.streetSuffix);
    if (address.postDirection) streetParts.push(address.postDirection);
    
    if (address.unitAbbr && address.unitNumber) {
      streetParts.push(`${address.unitAbbr} ${address.unitNumber}`);
    } else if (address.unitNumber) {
      streetParts.push(`#${address.unitNumber}`);
    }

    if (streetParts.length > 0) {
      return streetParts.join(' ');
    }

    return address.fullAddress || '';
  };

  const formatFullAddressLines = (address: Address) => {
    const lines: string[] = [];
    const streetLine = buildStreetLine(address);
    const cityStateZip = buildCityStateZip(address);

    if (streetLine) {
      lines.push(streetLine);
    }
    if (cityStateZip) {
      if (!streetLine || !streetLine.toLowerCase().includes(cityStateZip.toLowerCase())) {
        lines.push(cityStateZip);
      }
    }

    if (lines.length === 0 && address.fullAddress) {
      lines.push(address.fullAddress);
    }

    return lines;
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
        <Header userName={user.name} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading person...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
        <Header userName={user.name} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-cocoa-600 dark:text-cocoa-300">Person not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.8s' }}>
        <Marshmallow size={40} animationDuration="3.8s" />
      </div>
      <div className="hidden dark:block fixed top-[25%] right-[12%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.2s', animationDelay: '0.9s' }}>
        <Marshmallow size={42} animationDuration="4.2s" />
      </div>
      <div className="hidden dark:block fixed top-[50%] left-[10%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4s', animationDelay: '1.3s' }}>
        <Marshmallow size={43} animationDuration="4s" />
      </div>
      <div className="hidden dark:block fixed top-[65%] right-[8%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.6s', animationDelay: '1.6s' }}>
        <Marshmallow size={44} animationDuration="3.6s" />
      </div>
      <div className="hidden dark:block fixed bottom-[35%] left-[15%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.4s', animationDelay: '0.5s' }}>
        <Marshmallow size={45} animationDuration="4.4s" />
      </div>
      <div className="hidden dark:block fixed bottom-[20%] right-[15%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.9s', animationDelay: '1.8s' }}>
        <Marshmallow size={41} animationDuration="3.9s" />
      </div>
      <div className="hidden dark:block fixed bottom-[55%] right-[18%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.3s', animationDelay: '1.1s' }}>
        <Marshmallow size={42} animationDuration="4.3s" />
      </div>

      <Header userName={user.name} />

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-cocoa-600 dark:text-cinnamon-400 hover:text-cocoa-700 dark:hover:text-cinnamon-300 font-medium text-sm flex items-center gap-1"
          >
            ← Back to People
          </button>
          <div className="flex gap-2">
            {!editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-lg text-sm hover:bg-cocoa-700 dark:hover:bg-cinnamon-700"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeletePerson}
                  className="px-3 py-1 bg-red-500 dark:bg-red-600 text-white rounded-lg text-sm hover:bg-red-600 dark:hover:bg-red-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Person Info */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50">{getPersonName()}</h1>
              <div className="flex gap-2">
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
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSavePerson} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-lg hover:bg-cocoa-700 dark:hover:bg-cinnamon-700 font-medium"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 text-cocoa-700 dark:text-cocoa-300 rounded-lg hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Addresses */}
              {person.addresses && person.addresses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide mb-3">Addresses</p>
                  <div className="space-y-3">
                    {person.addresses.map((address) => {
                        const addressLines = formatFullAddressLines(address);
                        
                        return (
                          <div key={address.id} className="p-3 bg-cocoa-50 dark:bg-cocoa-900/30 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                            <div className="flex items-start justify-between mb-2">
                              <span className="inline-block px-2 py-1 bg-cocoa-200 dark:bg-cocoa-700 text-cocoa-800 dark:text-cocoa-200 rounded text-xs font-semibold">
                                {address.location.name}
                              </span>
                              {address.isPrimary && (
                                <span className="text-xs text-cinnamon-600 dark:text-cinnamon-400 font-semibold">★ Primary</span>
                              )}
                            </div>
                            
                            {addressLines.map((line, idx) => (
                              <p key={idx} className="text-base text-cocoa-900 dark:text-cream-50">
                                {line}
                              </p>
                            ))}
                            
                            {address.isVerified && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                ✓ Verified
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {/* Phone Numbers */}
              {person.phones && person.phones.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide mb-3">Phone Numbers</p>
                  <div className="space-y-3">
                    {person.phones.map((phone) => (
                        <div key={phone.id} className="p-3 bg-cocoa-50 dark:bg-cocoa-900/30 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                          <div className="flex items-start justify-between mb-1">
                            <span className="inline-block px-2 py-1 bg-cocoa-200 dark:bg-cocoa-700 text-cocoa-800 dark:text-cocoa-200 rounded text-xs font-semibold">
                              {phone.location.name}
                            </span>
                            {phone.isPrimary && (
                              <span className="text-xs text-cinnamon-600 dark:text-cinnamon-400 font-semibold">★ Primary</span>
                            )}
                          </div>
                          
                          <p className="text-base text-cocoa-900 dark:text-cream-50 font-medium">
                            {phone.number}
                          </p>
                          
                          {phone.isVerified && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✓ Verified
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Email Addresses */}
              {person.emails && person.emails.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide mb-3">Email Addresses</p>
                  <div className="space-y-3">
                    {person.emails.map((email) => (
                        <div key={email.id} className="p-3 bg-cocoa-50 dark:bg-cocoa-900/30 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                          <div className="flex items-start justify-between mb-1">
                            <span className="inline-block px-2 py-1 bg-cocoa-200 dark:bg-cocoa-700 text-cocoa-800 dark:text-cocoa-200 rounded text-xs font-semibold">
                              {email.location.name}
                            </span>
                            {email.isPrimary && (
                              <span className="text-xs text-cinnamon-600 dark:text-cinnamon-400 font-semibold">★ Primary</span>
                            )}
                          </div>
                          
                          <p className="text-base text-cocoa-900 dark:text-cream-50">
                            {email.address}
                          </p>
                          
                          {email.isVerified && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✓ Verified
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* No Contact Info Message */}
              {person.addresses.length === 0 && person.phones.length === 0 && person.emails.length === 0 && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide mb-2">Contact Information</p>
                  <p className="text-base text-cocoa-600 dark:text-cocoa-400 italic">No contact information on file</p>
                </div>
              )}
              
              
              {/* Notes */}
              {person.notes && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Notes</p>
                  <p className="text-base text-cocoa-900 dark:text-cream-50">{person.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Voter Info */}
        {person.voter && (
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6 mb-6">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-6">🗳️ Voter Information</h2>
            
            {/* Residence Section */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-3 flex items-center gap-2">
                🏠 Residence Address
              </h3>
              {(() => {
                const residence = getResidenceAddress();
                if (residence) {
                  const addressLines = formatFullAddressLines(residence);
                  
                  return (
                    <div className="space-y-2">
                      {addressLines.length > 0 ? (
                        <div>
                          {addressLines.map((line, idx) => (
                            <p key={idx} className="text-base text-cocoa-900 dark:text-cream-50">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-base text-cocoa-600 dark:text-cocoa-400 italic">
                          Address on file (details incomplete)
                        </p>
                      )}
                      
                      {residence.isVerified && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          ✓ Verified
                        </p>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <p className="text-base text-cocoa-600 dark:text-cocoa-400 italic">
                      No residence address on file
                    </p>
                  );
                }
              })()}
            </div>

            {/* Registration Information */}
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-3 flex items-center gap-2">
                📋 Registration Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Registration Date</p>
                  <p className="text-base text-cocoa-900 dark:text-cream-50">
                    {person.voter.registrationDate ? formatDate(person.voter.registrationDate) : 'Not recorded'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Registration Number</p>
                  <p className="text-base text-cocoa-900 dark:text-cream-50 font-mono">
                    {person.voter.registrationNumber || person.voter.externalId || 'Not available'}
                  </p>
                </div>
                {person.voter.externalSource && (
                  <div>
                    <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Data Source</p>
                    <p className="text-base text-cocoa-900 dark:text-cream-50">
                      {person.voter.externalSource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Party & Precinct Information */}
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-3 flex items-center gap-2">
                🎯 Party & Precinct
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Party Affiliation</p>
                  {person.voter.party ? (
                    <p className="text-base text-cocoa-900 dark:text-cream-50">
                      <span className="font-semibold">{person.voter.party.abbr}</span> - {person.voter.party.name}
                    </p>
                  ) : (
                    <p className="text-base text-cocoa-600 dark:text-cocoa-400 italic">No party registered</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Precinct</p>
                  {person.voter.precinct ? (
                    <div>
                      <p className="text-base text-cocoa-900 dark:text-cream-50">{person.voter.precinct.name}</p>
                      {person.voter.precinctPortion && (
                        <p className="text-sm text-cocoa-700 dark:text-cocoa-300">
                          Portion: {person.voter.precinctPortion}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-base text-cocoa-600 dark:text-cocoa-400 italic">No precinct assigned</p>
                  )}
                </div>
              </div>
            </div>

            {/* Voting Status */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-3 flex items-center gap-2">
                ✉️ Voting Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">VBM Status</p>
                  <p className="text-base text-cocoa-900 dark:text-cream-50">
                    {person.voter.vbmStatus || 'Standard voting'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Volunteer Info */}
        {person.volunteer && (
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6 mb-6">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">🤝 Volunteer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Status</p>
                <p className="text-lg text-cocoa-900 dark:text-cream-50">{person.volunteer.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Hours Contributed</p>
                <p className="text-lg text-cocoa-900 dark:text-cream-50">{person.volunteer.hoursContributed} hours</p>
              </div>
              {person.volunteer.skills && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Skills</p>
                  <p className="text-lg text-cocoa-900 dark:text-cream-50">{person.volunteer.skills}</p>
                </div>
              )}
              {person.volunteer.availability && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Availability</p>
                  <p className="text-lg text-cocoa-900 dark:text-cream-50">{person.volunteer.availability}</p>
                </div>
              )}
              {person.volunteer.lastVolunteerDate && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Last Volunteer Date</p>
                  <p className="text-lg text-cocoa-900 dark:text-cream-50">{formatDate(person.volunteer.lastVolunteerDate)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Donor Info */}
        {person.donor && (
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6 mb-6">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">💰 Donor Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Total Contributed</p>
                <p className="text-lg text-cocoa-900 dark:text-cream-50">${person.donor.totalContributed.toFixed(2)}</p>
              </div>
              {person.donor.donorTier && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Donor Tier</p>
                  <p className="text-lg text-cocoa-900 dark:text-cream-50">{person.donor.donorTier}</p>
                </div>
              )}
              {person.donor.lastDonationDate && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Last Donation Date</p>
                  <p className="text-lg text-cocoa-900 dark:text-cream-50">{formatDate(person.donor.lastDonationDate)}</p>
                </div>
              )}
              {person.donor.lastDonationAmount && (
                <div>
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Last Donation Amount</p>
                  <p className="text-lg text-cocoa-900 dark:text-cream-50">${person.donor.lastDonationAmount.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Log */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">📞 Contact Log</h2>
            <button
              onClick={() => setShowLogModal(true)}
              className="px-3 py-1 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-lg text-sm hover:bg-cocoa-700 dark:hover:bg-cinnamon-700"
            >
              Log Contact
            </button>
          </div>

          {person.contactLogs && person.contactLogs.length > 0 ? (
            <div className="space-y-4">
              {person.contactLogs.map((log) => (
                <div key={log.id} className="border-l-4 border-cinnamon-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-cocoa-900 dark:text-cream-50">{log.method || log.contactType || 'Contact'}</p>
                    <p className="text-sm text-cocoa-500 dark:text-cocoa-400">{formatDate(log.createdAt)}</p>
                  </div>
                  {log.outcome && (
                    <p className="text-sm text-cocoa-700 dark:text-cocoa-300">Outcome: {log.outcome}</p>
                  )}
                  {log.notes && (
                    <p className="text-sm text-cocoa-700 dark:text-cocoa-300 mt-1">{log.notes}</p>
                  )}
                  {log.followUpNeeded && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">
                      ⚠️ Follow-up needed {log.followUpDate ? `by ${formatDate(log.followUpDate)}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-cocoa-600 dark:text-cocoa-300">No contact logs yet</p>
          )}
        </div>
      </main>

      {/* Log Contact Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">Log Contact</h2>
            
            <form onSubmit={handleLogContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">Contact Type</label>
                <select
                  value={contactForm.contactType}
                  onChange={(e) => setContactForm({ ...contactForm, contactType: e.target.value })}
                  className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="door">Door Knock</option>
                  <option value="sms">SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">Outcome</label>
                <select
                  value={contactForm.outcome}
                  onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })}
                  className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                >
                  <option value="contacted">Contacted</option>
                  <option value="refused">Refused</option>
                  <option value="not_home">Not Home</option>
                  <option value="no_answer">No Answer</option>
                  <option value="moved">Moved</option>
                  <option value="invalid">Invalid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={contactForm.followUpNeeded}
                  onChange={(e) => setContactForm({ ...contactForm, followUpNeeded: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-cocoa-700 dark:text-cocoa-300">Follow-up needed</span>
              </label>

              {contactForm.followUpNeeded && (
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={contactForm.followUpDate}
                    onChange={(e) => setContactForm({ ...contactForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-lg hover:bg-cocoa-700 dark:hover:bg-cinnamon-700 font-medium"
                >
                  Log Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
