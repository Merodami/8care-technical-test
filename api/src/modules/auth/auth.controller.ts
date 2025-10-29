import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify-email')
  async verifyEmail(@Query() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    if ('otpRequired' in result && result.otpRequired) {
      return result;
    }

    if ('refreshToken' in result && result.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { refreshToken, ...response } = result;
      return response;
    }

    return result;
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const userId = this.extractUserIdFromPartialToken(dto.partialToken);
    const result = await this.authService.verifyOtp(userId, dto.code);

    if ('refreshToken' in result && result.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { refreshToken, ...response } = result;
      return response;
    }

    return result;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const cookies = req.cookies as { refreshToken?: string } | undefined;
    const token = dto.refreshToken || cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return this.authService.refreshToken(token);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as { refreshToken?: string } | undefined;
    const token = dto.refreshToken || cookies?.refreshToken;
    this.clearRefreshTokenCookie(res);
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return this.authService.logout(token);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/error`);
      return;
    }
    const result = await this.authService.generateAuthResponse(
      req.user as Parameters<typeof this.authService.generateAuthResponse>[0],
    );
    this.setRefreshTokenCookie(res, result.refreshToken);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/error`);
      return;
    }
    const result = await this.authService.generateAuthResponse(
      req.user as Parameters<typeof this.authService.generateAuthResponse>[0],
    );
    this.setRefreshTokenCookie(res, result.refreshToken);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken');
  }

  private extractUserIdFromPartialToken(token: string): string {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as {
      sub: string;
    };
    return payload.sub;
  }
}
