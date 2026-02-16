import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Audit log entry details that can be stored as JSON
 */
export interface AuditLogDetails {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Log an audit event to the database
 * 
 * This function gracefully handles errors to ensure it never causes
 * a request to fail. All parameters except userId are optional to
 * allow flexible logging in different contexts.
 * 
 * @param userId - The ID of the user performing the action
 * @param action - The action being logged (e.g., "login", "logout", "create_campaign")
 * @param request - The NextRequest object to extract IP and user agent from
 * @param resource - Optional: The resource type being acted upon (e.g., "user", "campaign")
 * @param resourceId - Optional: The ID of the specific resource
 * @param details - Optional: Additional context as an object (will be stringified to JSON)
 * 
 * @example
 * // Simple login audit log
 * await auditLog(user.id, 'login', request);
 * 
 * @example
 * // Campaign creation with details
 * await auditLog(user.id, 'create_campaign', request, 'campaign', campaign.id, {
 *   campaignName: campaign.name,
 *   targetArea: campaign.targetArea
 * });
 * 
 * @example
 * // Failed login attempt (no userId needed)
 * await auditLog(null, 'failed_login', request, undefined, undefined, {
 *   email: attemptedEmail,
 *   reason: 'invalid_password'
 * });
 */
export async function auditLog(
  userId: string | null,
  action: string,
  request: NextRequest,
  resource?: string,
  resourceId?: string,
  details?: AuditLogDetails
): Promise<void> {
  try {
    // Extract IP address (check multiple headers for proxy compatibility)
    const ipAddress =
      (request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        undefined);

    // Extract user agent
    const userAgent = request.headers.get('user-agent') || undefined;

    // Create audit log entry
    // Note: userId is required by the schema, so we only log if we have one
    // For security events like failed logins, you might want to create a separate
    // SecurityLog model, but for now we'll only log authenticated actions
    if (!userId) {
      console.warn(
        '[Audit] Attempted to log action without userId:',
        { action, resource, ipAddress }
      );
      return;
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: resource || null,
        resourceId: resourceId || null,
        ipAddress,
        userAgent,
        // Store details as JSON string
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging failures should never break a request
    console.error('[Audit Log Error]', error);
  }
}

/**
 * Get audit logs for a specific user
 * Useful for user activity history, compliance reports, etc.
 * 
 * @param userId - The user ID to get logs for
 * @param limit - Maximum number of logs to return (default 100)
 * @param actionFilter - Optional: filter by specific action(s)
 * 
 * @example
 * // Get recent activity for a user
 * const logs = await getAuditLogsForUser(user.id, 20);
 * 
 * @example
 * // Get only login activities
 * const loginLogs = await getAuditLogsForUser(user.id, 100, 'login');
 */
export async function getAuditLogsForUser(
  userId: string,
  limit: number = 100,
  actionFilter?: string
) {
  try {
    const where: { userId: string; action?: string } = { userId };
    if (actionFilter) {
      where.action = actionFilter;
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('[Get Audit Logs Error]', error);
    return [];
  }
}

/**
 * Get audit logs for a specific resource
 * Useful for tracking changes to a campaign, job, etc.
 * 
 * @param resource - The resource type (e.g., "campaign", "job")
 * @param resourceId - The ID of the specific resource
 * @param limit - Maximum number of logs to return (default 100)
 * 
 * @example
 * // Get all actions performed on a specific campaign
 * const campaignLogs = await getAuditLogsForResource('campaign', campaignId, 50);
 */
export async function getAuditLogsForResource(
  resource: string,
  resourceId: string,
  limit: number = 100
) {
  try {
    return await prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[Get Resource Audit Logs Error]', error);
    return [];
  }
}

/**
 * Parse audit log details from stored JSON string
 * Safely parses JSON with fallback to empty object
 * 
 * @param detailsJson - The JSON string stored in the audit log
 * @returns Parsed object or empty object if parsing fails
 * 
 * @example
 * const auditLog = await prisma.auditLog.findUnique({ where: { id } });
 * const details = parseAuditDetails(auditLog.details);
 */
export function parseAuditDetails(detailsJson: string | null): AuditLogDetails {
  if (!detailsJson) return {};
  try {
    return JSON.parse(detailsJson);
  } catch (error) {
    console.error('[Parse Audit Details Error]', error);
    return {};
  }
}
