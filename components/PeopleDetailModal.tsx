'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ContactLog {
  id: string;
  method: string;
  outcome?: string;
  notes?: string;
  followUpNeeded: boolean;
  followUpDate?: string;
  createdAt: string;
}

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
  party?: {
    name: string;
    abbr: string;
    color?: string | null;
  };
  precinct?: {
    number: string;
    name?: string;
  };
  vbmStatus?: string;
}

interface Volunteer {
  id: string;
  status: string;
}

interface Donor {
  id: string;
  status: string;
  totalContributed?: number;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  notes?: string;
  gender?: string;
  birthDate?: string;
  addresses: Address[];
  phones: Phone[];
  emails: Email[];
  contactLogs: ContactLog[];
  voter?: Voter | null;
  volunteer?: Volunteer | null;
  donor?: Donor | null;
  createdAt: string;
}

interface PeopleDetailModalProps {
  personId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PeopleDetailModal({ personId, isOpen, onClose, onUpdate }: PeopleDetailModalProps) {
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [showLogContact, setShowLogContact] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    notes: '',
  });

  // Contact log form
  const [contactForm, setContactForm] = useState({
    method: 'call',
    outcome: 'reached',
    notes: '',
    followUpNeeded: false,
    followUpDate: '',
  });

  // Fetch person data
  useEffect(() => {
    if (!isOpen || !personId) return;

    const fetchPerson = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/v1/people/${personId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          if (response.status === 401) {
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
  }, [isOpen, personId, router]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditing(false);
      setShowLogContact(false);
      setShowDeleteConfirm(false);
      setError('');
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
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
        setError('Failed to save person');
        return;
      }

      const updated = await response.json();
      setPerson(updated);
      setEditing(false);
      if (onUpdate) onUpdate();
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
        setError('Failed to log contact');
        return;
      }

      setShowLogContact(false);
      setContactForm({
        method: 'call',
        outcome: 'reached',
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
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error logging contact:', err);
      setError('Error logging contact');
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/people/${personId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        setError('Failed to delete person');
        return;
      }

      onClose();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error deleting person:', err);
      setError('Error deleting person');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getPersonName = () => {
    if (!person) return '';
    const { firstName, lastName, middleName } = person;
    return middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
  };

  const getPrimaryEmail = () => {
    return person?.emails.find(e => e.isPrimary)?.address || 
           person?.emails[0]?.address || 
           'No email';
  };

  const getPrimaryPhone = () => {
    return person?.phones.find(p => p.isPrimary)?.number || 
           person?.phones[0]?.number || 
           'No phone';
  };

  const buildCityStateZip = (addr: Address) => {
    const city = addr.city?.trim();
    const state = addr.state?.trim();
    const zip = addr.zipCode?.trim();
    const parts: string[] = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    let line = parts.join(', ');
    if (zip) {
      line = line ? `${line} ${zip}` : zip;
    }
    return line;
  };

  const formatFullAddress = (addr: Address) => {
    const streetLine = addr.fullAddress?.trim() || '';
    const cityStateZip = buildCityStateZip(addr);
    if (streetLine && cityStateZip) {
      if (streetLine.toLowerCase().includes(cityStateZip.toLowerCase())) {
        return streetLine;
      }
      return `${streetLine}, ${cityStateZip}`;
    }
    return streetLine || cityStateZip || 'No address';
  };

  const getPrimaryAddress = () => {
    const addr = person?.addresses.find(a => a.isPrimary) || person?.addresses[0];
    if (!addr) return 'No address';
    return formatFullAddress(addr);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading person...</p>
          </div>
        ) : error ? (
          <div className="p-8">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
              {error}
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700"
            >
              Close
            </button>
          </div>
        ) : person ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-cocoa-200 dark:border-cocoa-700">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{getPersonName()}</h2>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
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
                  {person.voter?.party && (
                    <span className="inline-flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: person.voter.party.color || '#64748b' }}
                      ></span>
                      {person.voter.party.abbr}
                    </span>
                  )}
                  {person.voter?.vbmStatus && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-sm">
                      {person.voter.vbmStatus}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-cocoa-500 hover:text-cocoa-700 dark:text-cocoa-400 dark:hover:text-cocoa-200 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 bg-cinnamon-600 text-white rounded-lg hover:bg-cinnamon-700 font-medium transition-colors"
              >
                {editing ? '❌ Cancel Edit' : '✏️ Edit'}
              </button>
              <button
                onClick={() => setShowLogContact(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                📝 Log Contact
              </button>
              <button
                onClick={() => router.push(`/people/${personId}`)}
                className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium transition-colors"
              >
                🔗 Full Page
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                🗑️ Delete
              </button>
            </div>

            {/* Edit Form or Details */}
            {editing ? (
              <form onSubmit={handleSave} className="mb-6 p-4 bg-cocoa-50 dark:bg-cocoa-900/50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-cocoa-700 dark:text-cocoa-300 mb-2">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-cocoa-600 dark:text-cocoa-400">
                      <strong>Email:</strong> {getPrimaryEmail()}
                    </p>
                    <p className="text-cocoa-600 dark:text-cocoa-400">
                      <strong>Phone:</strong> {getPrimaryPhone()}
                    </p>
                    <p className="text-cocoa-600 dark:text-cocoa-400">
                      <strong>Address:</strong> {getPrimaryAddress()}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-cocoa-700 dark:text-cocoa-300 mb-2">Registration Info</h3>
                  <div className="space-y-2 text-sm">
                    {person.voter?.party && (
                      <p className="text-cocoa-600 dark:text-cocoa-400">
                        <strong>Party:</strong> {person.voter.party.name}
                      </p>
                    )}
                    {person.voter?.precinct && (
                      <p className="text-cocoa-600 dark:text-cocoa-400">
                        <strong>Precinct:</strong> {person.voter.precinct.number}
                        {person.voter.precinct.name && ` - ${person.voter.precinct.name}`}
                      </p>
                    )}
                    {person.gender && (
                      <p className="text-cocoa-600 dark:text-cocoa-400">
                        <strong>Gender:</strong> {person.gender}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {person.notes && !editing && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <h3 className="text-sm font-semibold text-cocoa-700 dark:text-cocoa-300 mb-1">Notes</h3>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-400">{person.notes}</p>
              </div>
            )}

            {/* Contact History */}
            <div>
              <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-3">Contact History</h3>
              {person.contactLogs.length === 0 ? (
                <p className="text-cocoa-600 dark:text-cocoa-300 text-sm">No contact history yet</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {person.contactLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-cocoa-50 dark:bg-cocoa-900/50 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-cocoa-900 dark:text-cream-50">
                          {log.method === 'call' && '📞'}
                          {log.method === 'email' && '✉️'}
                          {log.method === 'door_knock' && '🚪'}
                          {log.method === 'sms' && '📱'}
                          {' '}{log.method}
                        </span>
                        <span className="text-xs text-cocoa-500 dark:text-cocoa-400">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      {log.outcome && (
                        <p className="text-sm text-cocoa-600 dark:text-cocoa-400">
                          <strong>Outcome:</strong> {log.outcome}
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-sm text-cocoa-600 dark:text-cocoa-400 mt-1">{log.notes}</p>
                      )}
                      {log.followUpNeeded && (
                        <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                          ⚠️ Follow-up needed{log.followUpDate && `: ${formatDate(log.followUpDate)}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Log Contact Modal */}
            {showLogContact && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowLogContact(false)}>
                <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">Log Contact</h3>
                  <form onSubmit={handleLogContact}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                          Contact Method
                        </label>
                        <select
                          value={contactForm.method}
                          onChange={(e) => setContactForm({ ...contactForm, method: e.target.value })}
                          className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                        >
                          <option value="call">Phone Call</option>
                          <option value="email">Email</option>
                          <option value="door_knock">Door Knock</option>
                          <option value="sms">SMS/Text</option>
                          <option value="mail">Mail</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                          Outcome
                        </label>
                        <select
                          value={contactForm.outcome}
                          onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })}
                          className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                        >
                          <option value="reached">Reached</option>
                          <option value="refused">Refused</option>
                          <option value="not_home">Not Home</option>
                          <option value="no_answer">No Answer</option>
                          <option value="moved">Moved</option>
                          <option value="invalid">Invalid Contact</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={contactForm.notes}
                          onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                          placeholder="Additional notes..."
                        />
                      </div>
                      <div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contactForm.followUpNeeded}
                            onChange={(e) => setContactForm({ ...contactForm, followUpNeeded: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm text-cocoa-700 dark:text-cocoa-300">Follow-up needed</span>
                        </label>
                      </div>
                      {contactForm.followUpNeeded && (
                        <div>
                          <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                            Follow-up Date
                          </label>
                          <input
                            type="date"
                            value={contactForm.followUpDate}
                            onChange={(e) => setContactForm({ ...contactForm, followUpDate: e.target.value })}
                            className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowLogContact(false)}
                        className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >
                        Save Contact Log
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteConfirm(false)}>
                <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">Confirm Delete</h3>
                  <p className="text-cocoa-600 dark:text-cocoa-300 mb-6">
                    Are you sure you want to delete this person? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
