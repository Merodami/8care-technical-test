import { Request } from 'express';

export interface UserPayload {
  id: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

export interface RequestWithUser extends Request {
  user?: UserPayload;
  id?: string;
}
