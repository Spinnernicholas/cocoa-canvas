/**
 * Simple CSV Voter File Importer
 * 
 * Basic CSV format with minimal fields:
 * - firstname, lastname (required)
 * - email, phone, address, city, zip (optional)
 * 
 * This is useful for quick imports when you don't have standardized
 * county voter file data.
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import {
  VoterImporter,
  VoterImportOptions,
  VoterImportResult,
} from './types';
import { prisma } from '@/lib/prisma';
import { ensureHouseholdForPerson } from './household-helper';

/**
 * Normalize string field
 */
function normalize(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class SimpleCsvImporter implements VoterImporter {
  readonly formatId = 'simple_csv';
  readonly formatName = 'Simple CSV';
  readonly description = 'Basic CSV with firstname, lastname, and optional contact fields';
  readonly supportedExtensions = ['.csv'];
  readonly supportsIncremental = false; // No unique ID to match on
  
  async importFile(options: VoterImportOptions): Promise<VoterImportResult> {
    const { filePath, importType, fileSize, onProgress, resumeFromProcessed } = options;
    
    if (importType === 'incremental') {
      return {
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        message: 'Simple CSV format does not support incremental imports',
      };
    }
    
    // Get or create location types
    const locations = await prisma.location.findMany();
    let residenceLocation = locations.find(lt => lt.name === 'Residence');
    let cellLocation = locations.find(lt => lt.name === 'Cell');
    
    if (!residenceLocation || !cellLocation) {
      return {
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        message: 'Location types not initialized. Run seed-locations first.',
      };
    }
    
    let processed = Math.max(0, resumeFromProcessed || 0);
    let created = 0;
    let skipped = 0;
    let bytesProcessed = 0;
    let resumeRowsRemaining = Math.max(0, resumeFromProcessed || 0);
    const errors: Array<{ row: number; field?: string; message: string }> = [];
    
    return new Promise((resolve) => {
      const parser = parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
      
      const stream = createReadStream(filePath);
      
      // Track bytes read from stream
      stream.on('data', (chunk: string | Buffer) => {
        bytesProcessed += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
      });
      
      stream.pipe(parser);
      
      parser.on('data', async (record: any) => {
        try {
          parser.pause();

          if (resumeRowsRemaining > 0) {
            resumeRowsRemaining--;
            parser.resume();
            return;
          }
          
          const firstName = normalize(record.firstname || record.first_name || record.FirstName);
          const lastName = normalize(record.lastname || record.last_name || record.LastName);
          
          if (!firstName || !lastName) {
            errors.push({
              row: processed + 1,
              message: 'Missing required fields: firstname and lastname',
            });
            processed++;
            parser.resume();
            return;
          }
          
          // Extract optional fields
          const email = normalize(record.email || record.Email);
          const phone = normalize(record.phone || record.Phone);
          const address = normalize(record.address || record.Address);
          const city = normalize(record.city || record.City);
          const state = normalize(record.state || record.State) || 'CA';
          const zipCode = normalize(record.zip || record.Zip);
          
          // Step 1: Create Person record
          const person = await prisma.person.create({
            data: {
              firstName,
              lastName,
            },
          });
          
          // Step 2: Create Voter linked to Person
          const voter = await prisma.voter.create({
            data: {
              personId: person.id,
              externalSource: 'simple_csv',
              registrationDate: new Date(),
              importedFrom: 'simple_csv',
              importType: 'full',
              importFormat: 'simple_csv',
            },
          });
          
          // Step 3: Create household and link person (if address provided)
          if (address && city && zipCode) {
            try {
              await ensureHouseholdForPerson(person.id, {
                streetName: address,
                city,
                state,
                zipCode,
              });
            } catch (householdError) {
              console.warn(`Could not create household for ${address}: ${householdError}`);
              // Continue - household creation is not critical for the import
            }
          }
          
          // Step 4: Create address record (linked to Person)
          if (address && city && zipCode) {
            await prisma.address.create({
              data: {
                personId: person.id,
                locationId: residenceLocation.id,
                fullAddress: `${address}, ${city}, ${state} ${zipCode}`,
                streetName: address,
                city,
                state,
                zipCode,
                isPrimary: true,
                isVerified: false,
                source: 'simple_csv',
              },
            });
          }
          
          // Step 5: Create phone (linked to Person)
          if (phone) {
            await prisma.phone.create({
              data: {
                personId: person.id,
                locationId: cellLocation.id,
                number: phone,
                isPrimary: true,
                isVerified: false,
                source: 'simple_csv',
              },
            });
          }
          
          // Step 6: Create email (linked to Person)
          if (email) {
            await prisma.email.create({
              data: {
                personId: person.id,
                locationId: residenceLocation.id,
                address: email,
                isPrimary: false,
                isVerified: false,
                source: 'simple_csv',
              },
            });
          }
          
          created++;
          processed++;
          
          if (onProgress && processed % 100 === 0) {
            onProgress(processed, 0, errors.length, bytesProcessed);
          }
          
          parser.resume();
        } catch (error: any) {
          if (error.code === 'P2002') {
            errors.push({
              row: processed + 1,
              message: 'Duplicate voter record',
            });
            skipped++;
          } else {
            errors.push({
              row: processed + 1,
              message: error.message || 'Failed to create voter',
            });
          }
          processed++;
          parser.resume();
        }
      });
      
      parser.on('end', () => {
        console.log(`[Simple CSV Import] Complete: ${created} created, ${errors.length} errors, ${skipped} skipped`);
        resolve({
          success: errors.length === 0,
          processed,
          created,
          updated: 0,
          skipped,
          errors: errors.length,
          errorDetails: errors.length > 0 ? errors : undefined,
        });
      });
      
      parser.on('error', (error: Error) => {
        console.error('[Simple CSV Import Error]', error);
        resolve({
          success: false,
          processed,
          created,
          updated: 0,
          skipped,
          errors: errors.length + 1,
          errorDetails: [
            ...errors,
            {
              row: 0,
              message: `CSV Parse Error: ${error.message}`,
            },
          ],
        });
      });
    });
  }
  
  async validateFormat(filePath: string): Promise<boolean> {
    // Check if file has firstname/lastname headers
    return new Promise((resolve) => {
      const parser = parse({
        delimiter: ',',
        columns: true,
        to_line: 1, // Only read header
      });
      
      const stream = createReadStream(filePath);
      stream.pipe(parser);
      
      parser.on('data', (record: any) => {
        const hasFirstName = 'firstname' in record || 'first_name' in record || 'FirstName' in record;
        const hasLastName = 'lastname' in record || 'last_name' in record || 'LastName' in record;
        resolve(hasFirstName && hasLastName);
      });
      
      parser.on('error', () => resolve(false));
    });
  }
  
  getFormatHelp(): string {
    return `
Simple CSV Import Format

Format: Comma-separated values (.csv)

Required columns:
  - firstname (or first_name, FirstName)
  - lastname (or last_name, LastName)

Optional columns:
  - email
  - phone
  - address
  - city
  - zip

Example:
firstname,lastname,email,phone
John,Doe,john@example.com,555-1234
Jane,Smith,jane@example.com,555-5678

Note: This format does NOT support incremental imports.
For advanced imports with full voter data, use jurisdiction-specific formats.
`.trim();
  }
}

// Export singleton instance
export const simpleCsvImporter = new SimpleCsvImporter();
