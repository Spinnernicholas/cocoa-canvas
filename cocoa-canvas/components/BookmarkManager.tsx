'use client';

import { useState, useEffect } from 'react';

export interface Bookmark {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  description?: string;
}

interface BookmarkManagerProps {
  onLoadBookmark: (url: string) => void;
  currentUrl: string;
}

const STORAGE_KEY = 'gis-explorer-bookmarks';

export default function BookmarkManager({ onLoadBookmark, currentUrl }: BookmarkManagerProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [buttonRef, setButtonRef] = useState<HTMLDivElement | null>(null);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  }, []);

  // Save bookmarks to localStorage
  const saveToStorage = (updatedBookmarks: Bookmark[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
      setBookmarks(updatedBookmarks);
    } catch (err) {
      console.error('Failed to save bookmarks:', err);
    }
  };

  const handleSaveBookmark = () => {
    if (!bookmarkName.trim()) return;

    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      name: bookmarkName.trim(),
      url: currentUrl,
      description: bookmarkDescription.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...bookmarks, newBookmark];
    saveToStorage(updated);
    
    setBookmarkName('');
    setBookmarkDescription('');
    setIsSaveDialogOpen(false);
  };

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    saveToStorage(updated);
  };

  const handleLoadBookmark = (bookmark: Bookmark) => {
    onLoadBookmark(bookmark.url);
    setIsOpen(false);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={setButtonRef}>
      {/* Bookmark Button */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsSaveDialogOpen(true)}
          className="px-3 py-2 bg-cocoa-600 dark:bg-cocoa-700 text-white rounded hover:bg-cocoa-700 dark:hover:bg-cocoa-600 transition-colors flex items-center gap-2"
          title="Save current view as bookmark"
        >
          <span>⭐</span>
          <span className="hidden sm:inline">Save Bookmark</span>
        </button>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 bg-cocoa-100 dark:bg-cocoa-800 text-cocoa-900 dark:text-cocoa-100 rounded hover:bg-cocoa-200 dark:hover:bg-cocoa-700 transition-colors flex items-center gap-2"
          title="Manage bookmarks"
        >
          <span>📚</span>
          <span className="hidden sm:inline">Bookmarks ({bookmarks.length})</span>
        </button>
      </div>

      {/* Save Bookmark Dialog */}
      {isSaveDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-cocoa-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-cocoa-900 dark:text-cocoa-100">
              Save Bookmark
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-cocoa-700 dark:text-cocoa-300">
                  Bookmark Name *
                </label>
                <input
                  type="text"
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  placeholder="e.g., Downtown parcels view"
                  className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-900 text-cocoa-900 dark:text-cocoa-100"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-cocoa-700 dark:text-cocoa-300">
                  Description (optional)
                </label>
                <textarea
                  value={bookmarkDescription}
                  onChange={(e) => setBookmarkDescription(e.target.value)}
                  placeholder="Add notes about this view..."
                  className="w-full px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-900 text-cocoa-900 dark:text-cocoa-100"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveBookmark}
                disabled={!bookmarkName.trim()}
                className="flex-1 px-4 py-2 bg-cocoa-600 text-white rounded hover:bg-cocoa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsSaveDialogOpen(false);
                  setBookmarkName('');
                  setBookmarkDescription('');
                }}
                className="flex-1 px-4 py-2 bg-cocoa-200 dark:bg-cocoa-700 text-cocoa-900 dark:text-cocoa-100 rounded hover:bg-cocoa-300 dark:hover:bg-cocoa-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      {isOpen && buttonRef && (
        <div 
          className="fixed w-96 max-h-96 overflow-y-auto bg-white dark:bg-cocoa-800 border border-cocoa-300 dark:border-cocoa-600 rounded-lg shadow-lg z-[9999]"
          style={{
            top: `${buttonRef.getBoundingClientRect().bottom + 8}px`,
            right: `${window.innerWidth - buttonRef.getBoundingClientRect().right}px`,
          }}
        >
          <div className="p-4 border-b border-cocoa-200 dark:border-cocoa-700 flex justify-between items-center">
            <h3 className="font-semibold text-cocoa-900 dark:text-cocoa-100">
              Saved Bookmarks
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-cocoa-500 hover:text-cocoa-700 dark:text-cocoa-400 dark:hover:text-cocoa-200"
            >
              ✕
            </button>
          </div>
          
          {bookmarks.length === 0 ? (
            <div className="p-6 text-center text-cocoa-500 dark:text-cocoa-400">
              No bookmarks saved yet.
              <br />
              <span className="text-sm">Save your current view to get started!</span>
            </div>
          ) : (
            <div className="divide-y divide-cocoa-200 dark:divide-cocoa-700">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="p-3 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <button
                      onClick={() => handleLoadBookmark(bookmark)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-cocoa-900 dark:text-cocoa-100 hover:text-cocoa-600 dark:hover:text-cocoa-300">
                        {bookmark.name}
                      </div>
                      {bookmark.description && (
                        <div className="text-sm text-cocoa-600 dark:text-cocoa-400 mt-1">
                          {bookmark.description}
                        </div>
                      )}
                      <div className="text-xs text-cocoa-500 dark:text-cocoa-500 mt-1">
                        {formatDate(bookmark.createdAt)}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1"
                      title="Delete bookmark"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
