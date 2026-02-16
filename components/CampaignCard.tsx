'use client';

interface CampaignCardProps {
  name?: string;
  startDate?: string;
  endDate?: string;
  targetArea?: string;
  status?: string;
}

export default function CampaignCard({
  name = 'Demo Campaign',
  startDate = '2026-02-15',
  endDate = '2026-03-15',
  targetArea = 'City District',
  status = 'active',
}: CampaignCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'planning':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'paused':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'completed':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
      default:
        return 'bg-cocoa-100 dark:bg-cocoa-900/30 text-cocoa-800 dark:text-cocoa-300 border-cocoa-300 dark:border-cocoa-700';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'active':
        return '🚀';
      case 'planning':
        return '📋';
      case 'paused':
        return '⏸️';
      case 'completed':
        return '✓';
      default:
        return '📊';
    }
  };

  return (
    <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 border-l-4 border-cinnamon-500 dark:border-cinnamon-600">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50">{name}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatusColor(status)}`}>
          {getStatusEmoji(status)} {status}
        </span>
      </div>

      <div className="space-y-3 text-cocoa-600 dark:text-cocoa-300">
        <div className="flex items-center gap-3">
          <span className="text-lg">📅</span>
          <div>
            <p className="text-xs uppercase text-cocoa-500 dark:text-cocoa-400 font-medium">Duration</p>
            <p className="text-sm">{formatDate(startDate)} - {formatDate(endDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-lg">📍</span>
          <div>
            <p className="text-xs uppercase text-cocoa-500 dark:text-cocoa-400 font-medium">Target Area</p>
            <p className="text-sm">{targetArea}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-cocoa-200 dark:border-cocoa-700">
        <button className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium transition-colors">
          Manage Campaign →
        </button>
      </div>
    </div>
  );
}
