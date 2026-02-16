import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.trim().split('\n');

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    // Parse CSV (simple implementation, assumes no commas in values)
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIndex = headers.indexOf('name');
    const emailIndex = headers.indexOf('email');
    const phoneIndex = headers.indexOf('phone');
    const addressIndex = headers.indexOf('address');

    if (nameIndex === -1) {
      return NextResponse.json(
        { error: 'CSV must have a "name" column' },
        { status: 400 }
      );
    }

    const voters = [];
    const errors = [];

    // Parse and create voters
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());

      try {
        const voter = await prisma.voter.create({
          data: {
            name: values[nameIndex],
            email: emailIndex !== -1 && values[emailIndex] ? values[emailIndex] : null,
            phone: phoneIndex !== -1 && values[phoneIndex] ? values[phoneIndex] : null,
            address: addressIndex !== -1 && values[addressIndex] ? values[addressIndex] : null,
            contactStatus: 'pending',
            registrationDate: new Date(),
            importedFrom: file.name,
          },
        });
        voters.push(voter);
      } catch (error: any) {
        if (error.code === 'P2002') {
          errors.push({
            row: i + 1,
            name: values[nameIndex],
            error: 'Duplicate email or phone',
          });
        } else {
          errors.push({
            row: i + 1,
            name: values[nameIndex],
            error: 'Failed to create voter',
          });
        }
      }
    }

    await auditLog(
      authResult.user?.userId || '',
      'VOTER_IMPORT',
      request,
      'voter',
      undefined,
      { imported: voters.length, errors: errors.length, file: file.name }
    );

    return NextResponse.json({
      success: true,
      imported: voters.length,
      errors,
      message: `Successfully imported ${voters.length} voters${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
    });
  } catch (error) {
    console.error('Error importing voters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
