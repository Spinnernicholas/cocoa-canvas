'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

interface OptionValue {
  id: string;
  name: string;
  abbr?: string;
  description?: string;
  color?: string;
  category?: string;
  isActive: boolean;
}

export default function OptionGroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeGroup, setActiveGroup] = useState<string>('parties');
  const [items, setItems] = useState<OptionValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OptionValue | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    abbr: '',
    description: '',
    color: '',
    category: '',
  });

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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/admin/option-groups/${activeGroup}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user, activeGroup, fetchItems]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('authToken');
      const url = editingItem
        ? `/api/v1/admin/option-groups/${activeGroup}/${editingItem.id}`
        : `/api/v1/admin/option-groups/${activeGroup}`;
      
      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddModal(false);
        setEditingItem(null);
        setFormData({ name: '', abbr: '', description: '', color: '', category: '' });
        fetchItems();
      }
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/admin/option-groups/${activeGroup}/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (response.ok) {
        fetchItems();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleEdit = (item: OptionValue) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      abbr: item.abbr || '',
      description: item.description || '',
      color: item.color || '',
      category: item.category || '',
    });
    setShowAddModal(true);
  };

  const optionGroupsCategories = [
    {
      category: 'Political & Campaign',
      description: 'Manage political parties and election types',
      groups: [
        { id: 'parties', name: 'Political Parties', icon: '🎗️', description: 'Manage political party names, abbreviations, and colors', fields: ['name', 'abbr', 'description', 'color'] },
        { id: 'election-types', name: 'Election Types', icon: '🗳️', description: 'Configure types of elections (Primary, General, Special, etc.)', fields: ['name', 'description'] },
      ]
    },
    {
      category: 'Geographic & Spatial',
      description: 'Manage location and spatial dataset classifications',
      groups: [
        { id: 'locations', name: 'Location Types', icon: '📍', description: 'Define categories for contact locations and addresses', fields: ['name', 'category', 'description'] },
        { id: 'dataset-types', name: 'Dataset Types', icon: '📊', description: 'Classify spatial datasets (Parcel, Precinct, Demographic, etc.)', fields: ['name', 'description', 'category'] },
      ]
    },
  ];

  // Flatten for easy lookup
  const allGroups = optionGroupsCategories.flatMap(cat => cat.groups);
  const activeGroupData = allGroups.find(g => g.id === activeGroup);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40">
        <Marshmallow size={40} animationDuration="3.8s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed top-[20%] right-[12%] opacity-40">
        <Marshmallow size={42} animationDuration="4.2s" animationDelay="0.7s" />
      </div>
      <div className="hidden dark:block fixed top-[45%] left-[15%] opacity-40">
        <Marshmallow size={43} animationDuration="4s" animationDelay="1.2s" />
      </div>
      <div className="hidden dark:block fixed top-[60%] right-[8%] opacity-40">
        <Marshmallow size={44} animationDuration="3.6s" animationDelay="1.5s" />
      </div>
      <div className="hidden dark:block fixed bottom-[30%] left-[10%] opacity-40">
        <Marshmallow size={45} animationDuration="4.4s" animationDelay="0.5s" />
      </div>
      <div className="hidden dark:block fixed bottom-[15%] right-[18%] opacity-40">
        <Marshmallow size={41} animationDuration="3.9s" animationDelay="1.8s" />
      </div>
      <div className="hidden dark:block fixed bottom-[50%] left-[20%] opacity-40">
        <Marshmallow size={42} animationDuration="4.1s" animationDelay="1.0s" />
      </div>

      <Header userName={user.name} />

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-cocoa-600 dark:text-cinnamon-400 hover:text-cocoa-700 dark:hover:text-cinnamon-300 font-medium text-sm flex items-center gap-1 mb-2"
            >
              ← Back to Admin
            </button>
            <h1 className="text-4xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
              📋 Option Groups
            </h1>
            <p className="text-cocoa-600 dark:text-cocoa-300">
              Manage customizable reference lists used throughout the system
            </p>
          </div>
        </div>

        {/* Categorized Group Selector */}
        {optionGroupsCategories.map((section) => (
          <div key={section.category} className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-1">
                {section.category}
              </h2>
              <p className="text-cocoa-600 dark:text-cocoa-300">
                {section.description}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={`p-6 rounded-lg shadow-sm border-2 text-left transition-all ${
                    activeGroup === group.id
                      ? 'border-cocoa-600 dark:border-cinnamon-500 bg-cocoa-50 dark:bg-cocoa-700/50'
                      : 'border-cocoa-200 dark:border-cocoa-700 bg-white dark:bg-cocoa-800 hover:border-cocoa-300 dark:hover:border-cocoa-600 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{group.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-1">
                        {group.name}
                      </h3>
                      <p className="text-sm text-cocoa-600 dark:text-cocoa-300">
                        {group.description}
                      </p>
                    </div>
                    {activeGroup === group.id && (
                      <div className="text-cocoa-600 dark:text-cinnamon-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Items List */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">
              {activeGroupData?.icon} {activeGroupData?.name}
            </h2>
            <button
              onClick={() => {
                setEditingItem(null);
                setFormData({ name: '', abbr: '', description: '', color: '', category: '' });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-lg hover:bg-cocoa-700 dark:hover:bg-cinnamon-700 font-medium"
            >
              + Add New
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : items.length === 0 ? (
            <p className="text-center py-8 text-cocoa-600 dark:text-cocoa-300">
              No items found. Click &quot;Add New&quot; to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-cocoa-200 dark:border-cocoa-700 rounded-lg hover:bg-cocoa-50 dark:hover:bg-cocoa-700/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-cocoa-900 dark:text-cream-50">
                        {item.name}
                      </h3>
                      {item.abbr && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-700 dark:text-cocoa-300 rounded">
                          {item.abbr}
                        </span>
                      )}
                      {item.color && (
                        <span
                          className="w-6 h-6 rounded-full border-2 border-cocoa-300 dark:border-cocoa-600"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      {!item.isActive && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-cocoa-600 dark:text-cocoa-300 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-3 py-1 text-sm bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-700 dark:text-cocoa-300 rounded hover:bg-cocoa-200 dark:hover:bg-cocoa-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">
              {editingItem ? 'Edit' : 'Add New'} {activeGroupData?.name.slice(0, -1) || 'Item'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                />
              </div>

              {activeGroup === 'parties' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                      Abbreviation
                    </label>
                    <input
                      type="text"
                      value={formData.abbr}
                      onChange={(e) => setFormData({ ...formData, abbr: e.target.value })}
                      className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700"
                    />
                  </div>
                </>
              )}

              {activeGroup === 'locations' && (
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                  />
                </div>
              )}

              {activeGroup === 'dataset-types' && (
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                  >
                    <option value="">Select a category</option>
                    <option value="vector">Vector</option>
                    <option value="raster">Raster</option>
                    <option value="tabular">Tabular</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-lg hover:bg-cocoa-700 dark:hover:bg-cinnamon-700 font-medium"
                >
                  {editingItem ? 'Save Changes' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
