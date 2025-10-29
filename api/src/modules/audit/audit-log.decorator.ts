import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogMetadata {
  action: string;
  resourceType?: string;
}

export const AuditLog = (action: string, resourceType?: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, resourceType } as AuditLogMetadata);
