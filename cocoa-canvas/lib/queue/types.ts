/**
 * Job Output Statistics Types
 * 
 * Defines structures for tracking job-specific output metrics.
 * Each job type can populate relevant fields.
 */

/**
 * Common output statistics across all job types
 */
export interface OutputStats {
  type: string; // Job type: 'voter_import', 'geocode', etc.
  startedAt?: string; // ISO timestamp
  percentComplete?: number; // 0-100
  
  // Voter import specific
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  totalErrors?: number;
  bytesProcessed?: number;
  linesProcessed?: number; // Total lines including header
  headerDetected?: boolean; // Whether a header row was detected
  
  // Geocode specific
  householdsProcessed?: number;
  householdsGeocoded?: number;
  householdsFailed?: number;
  
  // File-based progress
  fileSize?: number; // Total file size in bytes
  filesProcessed?: number;
  
  // Generic custom fields
  [key: string]: any;
}

/**
 * Get formatted output stats for display
 */
export function formatOutputStats(stats: OutputStats | null): string {
  if (!stats) return 'N/A';

  const parts: string[] = [];
  
  if (stats.type === 'voter_import') {
    if (stats.bytesProcessed !== undefined && stats.fileSize !== undefined) {
      const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
      parts.push(`${mb(stats.bytesProcessed)} MB of ${mb(stats.fileSize)} MB`);
    }
    if (stats.recordsProcessed !== undefined) {
      parts.push(`${stats.recordsProcessed} records`);
    }
    if (stats.recordsCreated !== undefined || stats.recordsUpdated !== undefined) {
      const created = stats.recordsCreated || 0;
      const updated = stats.recordsUpdated || 0;
      parts.push(`(${created} created, ${updated} updated)`);
    }
  } else if (stats.type === 'geocode') {
    if (stats.householdsProcessed !== undefined) {
      parts.push(`${stats.householdsProcessed} households processed`);
    }
    if (stats.householdsGeocoded !== undefined) {
      parts.push(`${stats.householdsGeocoded} geocoded`);
    }
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Processing...';
}

/**
 * Calculate progress percentage from output stats
 */
export function getProgressFromStats(stats: OutputStats | null): number {
  if (!stats) return 0;
  
  if (stats.percentComplete !== undefined) {
    return Math.min(stats.percentComplete, 100);
  }
  
  // For file-based progress
  if (stats.bytesProcessed !== undefined && stats.fileSize !== undefined && stats.fileSize > 0) {
    return Math.min(
      Math.round((stats.bytesProcessed / stats.fileSize) * 100),
      100
    );
  }
  
  // For record-based progress
  if (stats.recordsProcessed !== undefined && stats.totalErrors !== undefined) {
    const total = stats.recordsProcessed + stats.totalErrors;
    if (total > 0) {
      return Math.min(Math.round((stats.recordsProcessed / total) * 100), 100);
    }
  }
  
  return 0;
}
