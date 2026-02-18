/**
 * Contra Costa County Voter File Importer
 * 
 * Supports import of Contra Costa County voter registration data
 * Handles both Full and Incremental imports
 * 
 * File Format: Tab-delimited text file with 92 fields
 * See: scripts/data-analysis/analyze_contra_costa.py for field analysis
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { LOCATION_TYPES } from '@/prisma/seeds/seed-locations';
import { prisma } from '@/lib/prisma';
import { ensureHouseholdForPerson } from './household-helper';
import { 
  VoterImporter, 
  VoterImportOptions, 
  VoterImportResult 
} from './types';

export interface ContraCostaImportOptions {
  filePath: string;
  importType: 'full' | 'incremental';
  jobId?: string;
  onProgress?: (processed: number, total: number, errors: number) => void;
}

export interface ContraCostaVoterRecord {
  RegistrationNumber: string;
  VoterID: string;
  VoterTitle: string;
  LastName: string;
  FirstName: string;
  MiddleName: string;
  NameSuffix: string;
  Gender: string;
  
  // Residence Address
  ResidenceCity: string;
  ResidenceZipCode: string;
  HouseNumber: string;
  PreDirection: string;
  StreetName: string;
  StreetSuffix: string;
  PostDirection: string;
  UnitAbbr: string;
  UnitNumber: string;
  
  // Mailing Address
  MailAddress1: string;
  MailAddress2: string;
  MailAddress3: string;
  MailAddress4: string;
  MailCity: string;
  MailState: string;
  MailZip: string;
  
  // Contact
  PhoneNumber: string;
  EmailAddress: string;
  
  // Registration Info
  RegistrationDate: string;
  BirthDate: string;
  BirthPlace: string;
  PartyName: string;
  PartyAbbr: string;
  Language: string;
  VBMProgramStatus: string;
  
  // Precinct
  PrecinctID: string;
  PrecinctPortion: string;
  PrecinctName: string;
  
  // Status
  StatusReason: string;
  
  // Election History (5 most recent)
  ElectionAbbr_1: string;
  ElectionAbbr_2: string;
  ElectionAbbr_3: string;
  ElectionAbbr_4: string;
  ElectionAbbr_5: string;
  
  ElectionDesc_1: string;
  ElectionDesc_2: string;
  ElectionDesc_3: string;
  ElectionDesc_4: string;
  ElectionDesc_5: string;
  
  ElectionDate_1: string;
  ElectionDate_2: string;
  ElectionDate_3: string;
  ElectionDate_4: string;
  ElectionDate_5: string;
  
  BallotPartyName_1: string;
  BallotPartyName_2: string;
  BallotPartyName_3: string;
  BallotPartyName_4: string;
  BallotPartyName_5: string;
  
  BallotPartyAbbr_1: string;
  BallotPartyAbbr_2: string;
  BallotPartyAbbr_3: string;
  BallotPartyAbbr_4: string;
  BallotPartyAbbr_5: string;
  
  BallotCounted_1: string;
  BallotCounted_2: string;
  BallotCounted_3: string;
  BallotCounted_4: string;
  BallotCounted_5: string;
  
  ElectionType_1: string;
  ElectionType_2: string;
  ElectionType_3: string;
  ElectionType_4: string;
  ElectionType_5: string;
  
  VotingMethodDesc_1: string;
  VotingMethodDesc_2: string;
  VotingMethodDesc_3: string;
  VotingMethodDesc_4: string;
  VotingMethodDesc_5: string;
  
  DistrictID_1: string;
  DistrictID_2: string;
  DistrictID_3: string;
  DistrictID_4: string;
  DistrictID_5: string;
  
  SubDistrict_1: string;
  SubDistrict_2: string;
  SubDistrict_3: string;
  SubDistrict_4: string;
  SubDistrict_5: string;
  
  DistrictName_1: string;
  DistrictName_2: string;
  DistrictName_3: string;
  DistrictName_4: string;
  DistrictName_5: string;
}

/**
 * Parse date string in MM/DD/YYYY format
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  try {
    const [month, day, year] = dateStr.trim().split('/');
    if (!month || !day || !year) return null;
    
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Normalize string field
 */
function normalize(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Import Contra Costa voter file
 */
export async function importContraCostaFile(
  options: ContraCostaImportOptions
): Promise<{ success: boolean; processed: number; errors: number; message?: string }> {
  
  const { filePath, importType, jobId, onProgress } = options;
  
  let processed = 0;
  let errors = 0;
  let skipped = 0;
  
  console.log(`[Contra Costa Import] Starting ${importType} import from: ${filePath}`);
  
  // Ensure location types exist
  const residenceLocation = await prisma.location.findUnique({ where: { name: 'Residence' } });
  const mailingLocation = await prisma.location.findUnique({ where: { name: 'Mailing' } });
  const unknownLocation = await prisma.location.findUnique({ where: { name: 'Unknown' } });
  
  if (!residenceLocation || !mailingLocation || !unknownLocation) {
    return {
      success: false,
      processed: 0,
      errors: 1,
      message: 'Location types not initialized. Run seed-locations first.',
    };
  }
  
  return new Promise((resolve) => {
    const parser = parse({
      delimiter: '\t',
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });
    
    const stream = createReadStream(filePath);
    
    stream.pipe(parser);
    
    parser.on('data', async (record: ContraCostaVoterRecord) => {
      try {
        // Pause stream while processing
        parser.pause();
        
        await processVoterRecord(record, importType, {
          residenceLocationId: residenceLocation.id,
          mailingLocationId: mailingLocation.id,
          unknownLocationId: unknownLocation.id,
        });
        
        processed++;
        
        if (onProgress && processed % 100 === 0) {
          onProgress(processed, 0, errors);
        }
        
        // Resume stream
        parser.resume();
      } catch (error) {
        console.error(`[Import Error] Row ${processed + 1}:`, error);
        errors++;
        parser.resume();
      }
    });
    
    parser.on('end', () => {
      console.log(`[Contra Costa Import] Complete: ${processed} processed, ${errors} errors, ${skipped} skipped`);
      resolve({ success: errors === 0, processed, errors });
    });
    
    parser.on('error', (error: Error) => {
      console.error('[Import Error]', error);
      resolve({ success: false, processed, errors: errors + 1, message: error.message });
    });
  });
}

/**
 * Process a single voter record
 */
async function processVoterRecord(
  record: ContraCostaVoterRecord,
  importType: 'full' | 'incremental',
  locations: { residenceLocationId: string; mailingLocationId: string; unknownLocationId: string }
) {
  
  const voterFileId = normalize(record.VoterID);
  const firstName = normalize(record.FirstName) || 'Unknown';
  const lastName = normalize(record.LastName) || 'Unknown';
  
  if (!voterFileId) {
    throw new Error('Missing VoterID');
  }
  
  // Step 1: Check if voter exists by external ID for deduplication
  let voter = await prisma.voter.findUnique({ 
    where: { 
      externalId_externalSource: {
        externalId: voterFileId,
        externalSource: 'contra_costa'
      }
    },
    include: { person: true }
  });
  
  // Step 2: If incremental import and voter doesn't exist, skip
  if (importType === 'incremental' && !voter) {
    return;
  }
  
  // Step 3: Create or find Person record
  let person = voter?.person;
  
  if (!person) {
    // Create new Person record
    person = await prisma.person.create({
      data: {
        firstName,
        lastName,
        gender: normalize(record.Gender),
        birthDate: parseDate(record.BirthDate),
        birthPlace: normalize(record.BirthPlace),
        title: normalize(record.VoterTitle),
        middleName: normalize(record.MiddleName),
        nameSuffix: normalize(record.NameSuffix),
        language: normalize(record.Language),
      },
    });
  } else if (importType === 'full') {
    // Update existing person in full import
    person = await prisma.person.update({
      where: { id: person.id },
      data: {
        firstName,
        lastName,
        gender: normalize(record.Gender),
        birthDate: parseDate(record.BirthDate) || person.birthDate,
        birthPlace: normalize(record.BirthPlace) || person.birthPlace,
        title: normalize(record.VoterTitle) || person.title,
        middleName: normalize(record.MiddleName) || person.middleName,
        nameSuffix: normalize(record.NameSuffix) || person.nameSuffix,
        language: normalize(record.Language) || person.language,
      },
    });
  }
  
  // Step 4: Prepare voter data
  // Look up Party by abbreviation
  const partyAbbr = normalize(record.PartyAbbr);
  let partyId: string | null = null;
  
  if (partyAbbr) {
    const party = await prisma.party.findUnique({
      where: { abbr: partyAbbr },
      select: { id: true }
    });
    partyId = party?.id || null;
  }
  
  // Look up Precinct by ID
  const precinctNum = normalize(record.PrecinctID);
  let precinctId: string | null = null;
  
  if (precinctNum) {
    const precinct = await prisma.precinct.findUnique({
      where: { number: precinctNum },
      select: { id: true }
    });
    precinctId = precinct?.id || null;
  }
  
  const voterData = {
    personId: person.id,
    externalId: voterFileId,
    externalSource: 'contra_costa',
    registrationNumber: normalize(record.RegistrationNumber),
    registrationDate: parseDate(record.RegistrationDate),
    partyId,
    vbmStatus: normalize(record.VBMProgramStatus),
    precinctId,
    precinctPortion: normalize(record.PrecinctPortion),
    importedFrom: 'contra_costa',
    importType,
    importFormat: 'contra_costa',
  };
  
  // Step 5: Create or update Voter
  if (voter) {
    // Update existing voter
    voter = await prisma.voter.update({
      where: { id: voter.id },
      data: voterData,
      include: { person: true },
    });
    
    // Clear contact info and vote history if full import
    if (importType === 'full') {
      await prisma.address.deleteMany({ where: { personId: person.id } });
      await prisma.phone.deleteMany({ where: { personId: person.id } });
      await prisma.email.deleteMany({ where: { personId: person.id } });
      await prisma.voteHistory.deleteMany({ where: { voterId: voter.id } });
    }
  } else {
    // Create new voter
    voter = await prisma.voter.create({
      data: voterData,
      include: { person: true },
    });
  }
  
  // Step 6: Add residence address (linked to Person)
  const resAddress = buildResidenceAddress(record);
  
  if (resAddress) {
    // Create household and link person to it
    try {
      await ensureHouseholdForPerson(person.id, {
        houseNumber: resAddress.houseNumber,
        preDirection: resAddress.preDirection,
        streetName: resAddress.streetName,
        streetSuffix: resAddress.streetSuffix,
        postDirection: resAddress.postDirection,
        unitAbbr: resAddress.unitAbbr,
        unitNumber: resAddress.unitNumber,
        city: resAddress.city,
        state: resAddress.state,
        zipCode: resAddress.zipCode,
      });
    } catch (householdError) {
      console.warn(`Could not create household for ${resAddress.fullAddress}: ${householdError}`);
      // Continue - household creation is not critical for the import
    }
    
    // Create address record
    await prisma.address.create({
      data: {
        personId: person.id,
        locationId: locations.residenceLocationId,
        ...resAddress,
        isPrimary: true,
        isVerified: true,
        source: 'contra_costa',
      },
    });
  }
  
  // Step 7: Add mailing address (if different from residence)
  const mailAddress = buildMailingAddress(record);
  if (mailAddress && mailAddress.fullAddress !== resAddress?.fullAddress) {
    await prisma.address.create({
      data: {
        personId: person.id,
        locationId: locations.mailingLocationId,
        ...mailAddress,
        isPrimary: false,
        isVerified: true,
        source: 'contra_costa',
      },
    });
  }
  
  // Step 8: Add email address
  const email = normalize(record.EmailAddress);
  if (email) {
    await prisma.email.create({
      data: {
        personId: person.id,
        locationId: locations.unknownLocationId,
        address: email,
        isPrimary: true,
        isVerified: false,
        source: 'contra_costa',
      },
    });
  }
  
  // Step 9: Add phone number
  const phone = normalize(record.PhoneNumber);
  if (phone) {
    await prisma.phone.create({
      data: {
        personId: person.id,
        locationId: locations.unknownLocationId,
        number: phone,
        isPrimary: true,
        isVerified: false,
        source: 'contra_costa',
      },
    });
  }
  
  // Step 10: Import vote history (5 most recent elections)
  for (let i = 1; i <= 5; i++) {
    const electionDate = parseDate(record[`ElectionDate_${i}` as keyof ContraCostaVoterRecord]);
    if (electionDate) {
      const electionAbbr = normalize(record[`ElectionAbbr_${i}` as keyof ContraCostaVoterRecord]) || 'UNKNOWN';
      
      // Look up or create Election by date
      let election = await prisma.election.findUnique({
        where: { electionDate },
        select: { id: true }
      });
      
      if (!election) {
        election = await prisma.election.create({
          data: {
            electionDate,
            electionAbbr,
            electionDesc: normalize(record[`ElectionDesc_${i}` as keyof ContraCostaVoterRecord]),
            electionType: normalize(record[`ElectionType_${i}` as keyof ContraCostaVoterRecord]),
          },
        });
      }
      
      // Look up ballot party by abbreviation
      const ballotPartyAbbr = normalize(record[`BallotPartyAbbr_${i}` as keyof ContraCostaVoterRecord]);
      let ballotPartyId: string | null = null;
      
      if (ballotPartyAbbr) {
        const ballotParty = await prisma.party.findUnique({
          where: { abbr: ballotPartyAbbr },
          select: { id: true }
        });
        ballotPartyId = ballotParty?.id || null;
      }
      
      // Create VoteHistory record
      await prisma.voteHistory.create({
        data: {
          voterId: voter.id,
          electionId: election.id,
          electionDate: electionDate,
          electionAbbr: normalize(record[`ElectionAbbr_${i}` as keyof ContraCostaVoterRecord]),
          electionDesc: normalize(record[`ElectionDesc_${i}` as keyof ContraCostaVoterRecord]),
          electionType: normalize(record[`ElectionType_${i}` as keyof ContraCostaVoterRecord]),
          participated: record[`BallotCounted_${i}` as keyof ContraCostaVoterRecord] === '1',
          votingMethod: normalize(record[`VotingMethodDesc_${i}` as keyof ContraCostaVoterRecord]),
          ballotPartyId,
          ballotPartyName: normalize(record[`BallotPartyName_${i}` as keyof ContraCostaVoterRecord]),
          districtId: normalize(record[`DistrictID_${i}` as keyof ContraCostaVoterRecord]),
          districtName: normalize(record[`DistrictName_${i}` as keyof ContraCostaVoterRecord]),
        },
      });
    }
  }
}

/**
 * Build residence address from record
 */
function buildResidenceAddress(record: ContraCostaVoterRecord) {
  const houseNumber = normalize(record.HouseNumber);
  const streetName = normalize(record.StreetName);
  
  if (!houseNumber || !streetName) return null;
  
  const parts = [
    houseNumber,
    record.PreDirection?.trim(),
    streetName,
    record.StreetSuffix?.trim(),
    record.PostDirection?.trim(),
    record.UnitAbbr?.trim() && record.UnitNumber?.trim() 
      ? `${record.UnitAbbr.trim()} ${record.UnitNumber.trim()}`
      : null,
  ].filter(Boolean);
  
  const fullAddress = parts.join(' ');
  
  return {
    houseNumber,
    preDirection: normalize(record.PreDirection),
    streetName,
    streetSuffix: normalize(record.StreetSuffix),
    postDirection: normalize(record.PostDirection),
    unitAbbr: normalize(record.UnitAbbr),
    unitNumber: normalize(record.UnitNumber),
    city: normalize(record.ResidenceCity),
    state: 'CA',
    zipCode: normalize(record.ResidenceZipCode),
    fullAddress,
  };
}

/**
 * Build mailing address from record
 */
function buildMailingAddress(record: ContraCostaVoterRecord) {
  const mailAddress1 = normalize(record.MailAddress1);
  
  if (!mailAddress1) return null;
  
  return {
    fullAddress: mailAddress1,
    city: normalize(record.MailCity),
    state: normalize(record.MailState),
    zipCode: normalize(record.MailZip),
  };
}

/**
 * Contra Costa County Voter File Importer
 * Implements the VoterImporter interface for registry
 */
export class ContraCostaImporter implements VoterImporter {
  readonly formatId = 'contra_costa';
  readonly formatName = 'Contra Costa County';
  readonly description = 'Contra Costa County voter registration file (92 fields, tab-delimited)';
  readonly supportedExtensions = ['.txt', '.tsv'];
  readonly supportsIncremental = true;
  
  async importFile(options: VoterImportOptions): Promise<VoterImportResult> {
    const result = await importContraCostaFile({
      filePath: options.filePath,
      importType: options.importType,
      jobId: options.jobId,
      onProgress: options.onProgress,
    });
    
    return {
      success: result.success,
      processed: result.processed,
      created: result.processed, // TODO: Track separately
      updated: 0, // TODO: Track separately
      skipped: 0, // TODO: Track separately
      errors: result.errors,
      message: result.message,
    };
  }
  
  async validateFormat(filePath: string): Promise<boolean> {
    // TODO: Implement format validation
    // Could check for expected header columns
    return true;
  }
  
  getFormatHelp(): string {
    return `
Contra Costa County Voter Registration File

Format: Tab-delimited text file (.txt or .tsv)
Fields: 92 columns including:
  - Voter identity (name, DOB, gender, party)
  - Residence address (structured components)
  - Mailing address (if different)
  - Contact info (phone, email)
  - Registration details
  - Precinct information
  - Vote history (5 most recent elections)

Obtained from: Contra Costa County Registrar of Voters
Typical file size: 500MB - 1GB
`.trim();
  }
}

// Export singleton instance
export const contraCostaImporter = new ContraCostaImporter();
