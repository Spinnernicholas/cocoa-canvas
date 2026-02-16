/**
 * Common types and interfaces for voter file importers
 */

import { Prisma } from '@prisma/client';

export type ImportType = 'full' | 'incremental';

export interface VoterImportResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails?: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  message?: string;
}

export interface VoterImportOptions {
  filePath: string;
  importType: ImportType;
  format: string;
  jobId?: string;
  userId?: string;
  onProgress?: (processed: number, total: number, errors: number) => void;
}

export interface ParsedVoterRecord {
  // Identity
  externalId?: string;
  externalVoterId?: string;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nameSuffix?: string;
  
  // Demographics
  gender?: string;
  birthDate?: Date;
  birthPlace?: string;
  language?: string;
  
  // Registration
  registrationDate?: Date;
  partyAffiliation?: string;
  partyAbbreviation?: string;
  vbmStatus?: string;
  statusReason?: string;
  
  // Geographic
  precinctId?: string;
  precinctPortion?: string;
  precinctName?: string;
  
  // Contact info (to be created as separate ContactInfo records)
  residenceAddress?: {
    houseNumber?: string;
    preDirection?: string;
    streetName?: string;
    streetSuffix?: string;
    postDirection?: string;
    unitAbbr?: string;
    unitNumber?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    fullAddress?: string;
  };
  
  mailingAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
    addressLine4?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    fullAddress?: string;
  };
  
  phone?: string;
  email?: string;
  
  // Vote history (to be created as separate VoteHistory records)
  voteHistory?: Array<{
    electionAbbr?: string;
    electionDesc?: string;
    electionDate?: Date;
    electionType?: string;
    ballotPartyName?: string;
    ballotPartyAbbr?: string;
    ballotCounted?: boolean;
    votingMethod?: string;
    districtId?: string;
    subDistrict?: string;
    districtName?: string;
  }>;
  
  // Metadata
  notes?: string;
}

/**
 * Interface that all voter file importers must implement
 */
export interface VoterImporter {
  /**
   * Unique identifier for this importer (e.g., "contra_costa", "alameda")
   */
  readonly formatId: string;
  
  /**
   * Human-readable name for this format
   */
  readonly formatName: string;
  
  /**
   * Description of this format
   */
  readonly description: string;
  
  /**
   * File extensions this importer supports
   */
  readonly supportedExtensions: string[];
  
  /**
   * Whether this importer supports incremental updates
   */
  readonly supportsIncremental: boolean;
  
  /**
   * Import voters from a file
   */
  importFile(options: VoterImportOptions): Promise<VoterImportResult>;
  
  /**
   * Validate that a file matches this format (optional)
   * Can be used to auto-detect format
   */
  validateFormat?(filePath: string): Promise<boolean>;
  
  /**
   * Get format-specific help/documentation
   */
  getFormatHelp?(): string;
}
