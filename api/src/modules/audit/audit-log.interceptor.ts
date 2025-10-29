import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_LOG_KEY, AuditLogMetadata } from './audit-log.decorator';
import { AuditStatus } from '@prisma/client';

interface RequestWithUser {
  user?: { userId?: string };
  ip?: string;
  connection?: { remoteAddress?: string };
  headers?: { 'user-agent'?: string };
  method?: string;
  url?: string;
  params?: Record<string, unknown>;
}

interface ResponseData {
  id?: string;
  data?: { id?: string };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditLogMetadata>(AUDIT_LOG_KEY, context.getHandler());

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers?.['user-agent'];

    return next.handle().pipe(
      tap({
        next: (data: ResponseData) => {
          void this.auditService.log({
            userId: user?.userId,
            action: metadata.action,
            resourceType: metadata.resourceType,
            resourceId: data?.id || data?.data?.id,
            ipAddress,
            userAgent,
            metadata: {
              method: request.method,
              url: request.url,
              params: request.params,
            },
            status: AuditStatus.SUCCESS,
          });
        },
        error: (error: Error) => {
          void this.auditService.log({
            userId: user?.userId,
            action: metadata.action,
            resourceType: metadata.resourceType,
            ipAddress,
            userAgent,
            metadata: {
              method: request.method,
              url: request.url,
              error: error.message,
            },
            status: AuditStatus.FAILURE,
          });
        },
      }),
    );
  }
}
