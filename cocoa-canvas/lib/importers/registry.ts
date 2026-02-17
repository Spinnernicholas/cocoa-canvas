/**
 * Registry for voter file importers
 * 
 * This registry maintains a mapping of format identifiers to their
 * corresponding importer implementations. New formats can be registered
 * dynamically, making it easy to add support for new jurisdictions.
 */

import { VoterImporter } from './types';

class ImporterRegistry {
  private importers: Map<string, VoterImporter> = new Map();
  
  /**
   * Register a new importer
   */
  register(importer: VoterImporter): void {
    if (this.importers.has(importer.formatId)) {
      console.warn(`Importer for format '${importer.formatId}' is already registered. Overwriting.`);
    }
    this.importers.set(importer.formatId, importer);
    console.log(`Registered voter file importer: ${importer.formatId} (${importer.formatName})`);
  }
  
  /**
   * Get an importer by format ID
   */
  get(formatId: string): VoterImporter | undefined {
    return this.importers.get(formatId);
  }
  
  /**
   * Check if a format is supported
   */
  has(formatId: string): boolean {
    return this.importers.has(formatId);
  }
  
  /**
   * Get all registered importers
   */
  getAll(): VoterImporter[] {
    return Array.from(this.importers.values());
  }
  
  /**
   * Get list of supported format IDs
   */
  getFormatIds(): string[] {
    return Array.from(this.importers.keys());
  }
  
  /**
   * Get format metadata for UI
   */
  getFormats(): Array<{
    id: string;
    name: string;
    description: string;
    supportedExtensions: string[];
    supportsIncremental: boolean;
  }> {
    return Array.from(this.importers.values()).map(importer => ({
      id: importer.formatId,
      name: importer.formatName,
      description: importer.description,
      supportedExtensions: importer.supportedExtensions,
      supportsIncremental: importer.supportsIncremental,
    }));
  }
  
  /**
   * Auto-detect format from file (if importers support validation)
   */
  async detectFormat(filePath: string): Promise<string | null> {
    for (const importer of this.importers.values()) {
      if (importer.validateFormat) {
        try {
          const isValid = await importer.validateFormat(filePath);
          if (isValid) {
            return importer.formatId;
          }
        } catch (error) {
          console.warn(`Format validation failed for ${importer.formatId}:`, error);
        }
      }
    }
    return null;
  }
  
  /**
   * Unregister an importer (useful for testing)
   */
  unregister(formatId: string): boolean {
    return this.importers.delete(formatId);
  }
  
  /**
   * Clear all importers (useful for testing)
   */
  clear(): void {
    this.importers.clear();
  }
}

// Singleton instance
export const importerRegistry = new ImporterRegistry();

// Re-export types
export * from './types';
