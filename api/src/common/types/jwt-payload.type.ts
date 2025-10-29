export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface PartialJwtPayload {
  sub: string;
  otpPending: boolean;
  iat?: number;
  exp?: number;
}
