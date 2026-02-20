/**
 * Unified Voter File Import API
 * 
 * This single endpoint handles all voter file formats using the importer registry.
 * The format is specified as a field in the request.
 * 
 * Imports are processed as background jobs in the queue system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { importerRegistry } from '@/lib/importers';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';
import { createJob, markJobCancelled } from '@/lib/queue/runner';
import { getVoterImportQueue } from '@/lib/queue/bullmq';
import { ImportJobData } from '@/lib/importers/job-processor';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/voters/import
 * Get list of supported formats
 */
export async function GET() {
  try {
    const formats = importerRegistry.getFormats();
    
    return NextResponse.json({
      success: true,
      formats,
      count: formats.length,
    });
  } catch (error) {
    console.error('[Import API] Error fetching formats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve import formats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/voters/import
 * Import voter file
 * 
 * Body: multipart/form-data
 *   - file: The voter file to import
 *   - format: Format identifier (e.g., "contra_costa", "alameda")
 *   - importType: "full" or "incremental"
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const format = formData.get('format') as string | null;
    const importType = (formData.get('importType') as string) || 'full';
    
    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!format) {
      return NextResponse.json(
        { error: 'No format specified' },
        { status: 400 }
      );
    }
    
    if (importType !== 'full' && importType !== 'incremental') {
      return NextResponse.json(
        { error: 'Invalid importType. Must be "full" or "incremental"' },
        { status: 400 }
      );
    }
    
    // Check if format is supported
    const importer = importerRegistry.get(format);
    if (!importer) {
      return NextResponse.json(
        { 
          error: `Unsupported format: ${format}`,
          supportedFormats: importerRegistry.getFormatIds(),
        },
        { status: 400 }
      );
    }
    
    // Check if incremental is supported
    if (importType === 'incremental' && !importer.supportsIncremental) {
      return NextResponse.json(
        { error: `Format "${format}" does not support incremental imports` },
        { status: 400 }
      );
    }
    
    // Validate file extension
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!importer.supportedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { 
          error: `Invalid file extension for format "${format}". Expected: ${importer.supportedExtensions.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Save file temporarily
    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempFilePath = path.join(uploadDir, `${timestamp}_${safeFilename}`);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempFilePath, buffer);
    
    console.log(`[Import API] Processing ${format} import: ${file.name} (${buffer.length} bytes)`);
    
    // Create job for the import
    const job = await createJob(
      'voter_import',
      authResult.user?.userId || '',
      {
        filePath: tempFilePath,
        format,
        importType,
        fileName: file.name,
        fileSize: buffer.length,
      } as ImportJobData,
      {
        isDynamic: false,
      }
    );

    if (!job) {
      await unlink(tempFilePath).catch(() => {});
      return NextResponse.json(
        { error: 'Failed to create import job' },
        { status: 500 }
      );
    }

    // Audit log
    await auditLog(
      authResult.user?.userId || '',
      'VOTER_IMPORT_QUEUED',
      request,
      'voter',
      job.id,
      {
        format,
        importType,
        fileName: file.name,
        fileSize: buffer.length,
      }
    );

    try {
      const queue = getVoterImportQueue();
      await queue.add(
        'import-voters',
        {
          filePath: tempFilePath,
          format,
          importType,
          fileName: file.name,
          fileSize: buffer.length,
          userId: authResult.user?.userId,
        },
        {
          jobId: job.id,
        }
      );
    } catch (queueError) {
      console.error('[Import API] Failed to queue import job:', queueError);
      await unlink(tempFilePath).catch(() => {});
      await markJobCancelled(job.id, 'Failed to enqueue import job');
      return NextResponse.json(
        { error: 'Failed to queue import job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Import job created. Watch job ${job.id} for progress.`,
      format: importer.formatName,
      formatId: format,
      importType,
    }, { status: 202 }); // 202 Accepted
    
  } catch (error) {
    console.error('[Import API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
