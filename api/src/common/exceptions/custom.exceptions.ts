import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends HttpException {
  constructor(identifier?: string) {
    super(
      identifier ? `User with identifier '${identifier}' not found` : 'User not found',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super('Invalid email or password', HttpStatus.UNAUTHORIZED);
  }
}

export class EmailNotVerifiedException extends HttpException {
  constructor() {
    super('Email address is not verified. Please verify your email before logging in.', HttpStatus.FORBIDDEN);
  }
}

export class OTPRequiredException extends HttpException {
  constructor() {
    super('OTP verification required', HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidOTPException extends HttpException {
  constructor() {
    super('Invalid or expired OTP code', HttpStatus.UNAUTHORIZED);
  }
}

export class InsufficientPermissionsException extends HttpException {
  constructor(action?: string) {
    super(
      action ? `Insufficient permissions to ${action}` : 'Insufficient permissions',
      HttpStatus.FORBIDDEN,
    );
  }
}

export class TokenExpiredException extends HttpException {
  constructor(tokenType?: string) {
    super(
      tokenType ? `${tokenType} token has expired` : 'Token has expired',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class AccountInactiveException extends HttpException {
  constructor() {
    super('Account is inactive. Please contact support.', HttpStatus.FORBIDDEN);
  }
}

export class RoleNotFoundException extends HttpException {
  constructor(roleId?: string) {
    super(
      roleId ? `Role with ID '${roleId}' not found` : 'Role not found',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SystemRoleException extends HttpException {
  constructor() {
    super('Cannot modify or delete system roles', HttpStatus.FORBIDDEN);
  }
}
