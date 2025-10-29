import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface UserPayload {
  id: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

interface RequestWithUser {
  user?: UserPayload;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): UserPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (data && user) {
      return user[data] as UserPayload;
    }
    return user;
  },
);
