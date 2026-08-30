import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { ApiError } from '@lingcoo-tech/http';
import { hashPassword, needsPasswordRehash, verifyPassword } from '@lingcoo-tech/security/password';
import type {
  ChangePasswordRequest,
  ConfirmPasswordReset,
  LoginRequest,
} from '@ts-fastify-business-starter/contracts';
import { emailAddressSchema, passwordSchema } from '@ts-fastify-business-starter/contracts';

import type { AppEnvironment } from '../../../config/environment.js';
import type { DatabaseExecutor } from '../../../database/database.js';
import type {
  IdentityUserPage,
  PublicIdentitySession,
  PublicIdentityUser,
  ResolvedIdentitySession,
} from '../domain/model.js';
import type { IdentityRepository } from '../infrastructure/persistence/identity.repository.js';
import type { IdentityActionDelivery } from './action-delivery.port.js';

export interface IdentityLoginResult {
  sessionId: string;
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
  user: PublicIdentityUser;
}

function token(): string {
  return randomBytes(32).toString('base64url');
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function invalidCredentials(): ApiError {
  return new ApiError(401, 'INVALID_CREDENTIALS', '邮箱或密码错误');
}

function invalidActionToken(): ApiError {
  return new ApiError(400, 'INVALID_ACTION_TOKEN', '操作令牌无效或已过期');
}

export class IdentityService {
  private readonly dummyPasswordHash = hashPassword('not-a-real-user-password');

  constructor(
    private readonly repository: IdentityRepository,
    private readonly environment: AppEnvironment,
    private readonly actionDelivery: IdentityActionDelivery,
  ) {}

  async login(
    input: LoginRequest,
    context: { userAgent: string | null; ipAddress: string | null },
  ): Promise<IdentityLoginResult> {
    const credential = await this.repository.findCredentialByEmail(input.email);
    const passwordHash = credential?.passwordHash ?? (await this.dummyPasswordHash);
    const valid = await verifyPassword(input.password, passwordHash);
    if (!credential || !valid || credential.user.status !== 'active') throw invalidCredentials();

    if (needsPasswordRehash(credential.passwordHash)) {
      await this.repository.updatePasswordHash(
        credential.user.id,
        await hashPassword(input.password),
      );
    }

    const sessionToken = token();
    const csrfToken = token();
    const expiresAt = new Date(Date.now() + this.environment.AUTH_SESSION_TTL_SECONDS * 1000);
    const session = await this.repository.createSession({
      userId: credential.user.id,
      tokenDigest: digest(sessionToken),
      csrfDigest: digest(csrfToken),
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });
    return {
      sessionId: session.id,
      sessionToken,
      csrfToken,
      expiresAt: session.expiresAt,
      user: credential.user,
    };
  }

  async resolveSession(
    sessionToken: string,
    csrfToken: string,
  ): Promise<ResolvedIdentitySession | null> {
    const session = await this.repository.resolveSession(digest(sessionToken));
    if (!session || !this.digestMatches(csrfToken, session.csrfDigest)) return null;
    await this.repository.touchSession(session.sessionId);
    return session;
  }

  csrfMatches(value: string, expected: string): boolean {
    const actualBuffer = Buffer.from(value);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  async logout(sessionId: string): Promise<void> {
    await this.repository.revokeSession(sessionId);
  }

  listSessions(userId: string, currentSessionId: string): Promise<PublicIdentitySession[]> {
    return this.repository.listActiveSessions(userId, currentSessionId);
  }

  async revokeSession(userId: string, sessionId: string, currentSessionId: string): Promise<void> {
    if (sessionId === currentSessionId) {
      throw new ApiError(400, 'CURRENT_SESSION_REVOKE', '请使用退出登录撤销当前会话');
    }
    if (!(await this.repository.revokeOwnedSession(userId, sessionId, currentSessionId))) {
      throw new ApiError(404, 'SESSION_NOT_FOUND', '会话不存在或已失效');
    }
  }

  async changePassword(userId: string, input: ChangePasswordRequest): Promise<void> {
    const credential = await this.repository.findCredentialByUserId(userId);
    if (!credential || !(await verifyPassword(input.currentPassword, credential.passwordHash))) {
      throw invalidCredentials();
    }
    if (await verifyPassword(input.newPassword, credential.passwordHash)) {
      throw new ApiError(400, 'PASSWORD_REUSE', '新密码不能与当前密码相同');
    }
    await this.repository.changePasswordAndRevokeSessions(
      userId,
      await hashPassword(input.newPassword),
    );
  }

  async requestPasswordReset(email: string): Promise<{ accepted: true; testToken?: string }> {
    const user = await this.repository.findUserByEmail(email);
    if (!user || user.status !== 'active') return { accepted: true };
    const actionToken = token();
    const expiresAt = this.actionTokenExpiry();
    await this.repository.createActionToken({
      userId: user.id,
      purpose: 'password_reset',
      tokenDigest: digest(actionToken),
      expiresAt,
    });
    await this.actionDelivery.deliver({
      email: user.email,
      purpose: 'password_reset',
      token: actionToken,
      expiresAt,
    });
    return this.exposedActionToken(actionToken);
  }

  async confirmPasswordReset(input: ConfirmPasswordReset): Promise<void> {
    const consumed = await this.repository.resetPasswordWithToken(
      digest(input.token),
      await hashPassword(input.newPassword),
    );
    if (!consumed) throw invalidActionToken();
  }

  async requestEmailVerification(userId: string): Promise<{ accepted: true; testToken?: string }> {
    const credential = await this.repository.findCredentialByUserId(userId);
    if (!credential || credential.user.status !== 'active' || credential.user.emailVerifiedAt) {
      return { accepted: true };
    }
    const actionToken = token();
    const expiresAt = this.actionTokenExpiry();
    await this.repository.createActionToken({
      userId,
      purpose: 'email_verification',
      tokenDigest: digest(actionToken),
      expiresAt,
    });
    await this.actionDelivery.deliver({
      email: credential.user.email,
      purpose: 'email_verification',
      token: actionToken,
      expiresAt,
    });
    return this.exposedActionToken(actionToken);
  }

  async confirmEmailVerification(actionToken: string): Promise<void> {
    if (!(await this.repository.consumeEmailVerification(digest(actionToken)))) {
      throw invalidActionToken();
    }
  }

  async ensureBootstrapUser(email: string, password: string): Promise<PublicIdentityUser> {
    const existing = await this.repository.findUserByEmail(email);
    if (existing) return existing;
    return this.repository.createUser({
      email,
      passwordHash: await hashPassword(password),
      emailVerified: true,
    });
  }

  listUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    status?: 'active' | 'disabled';
  }): Promise<IdentityUserPage> {
    return this.repository.listUsers(input);
  }

  async getUser(userId: string): Promise<PublicIdentityUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new ApiError(404, 'IDENTITY_USER_NOT_FOUND', '账号不存在');
    return user;
  }

  async createUser(
    input: {
      email: string;
      password: string;
      displayName?: string | null;
      emailVerified?: boolean;
    },
    context: { executor?: DatabaseExecutor } = {},
  ): Promise<PublicIdentityUser> {
    const email = emailAddressSchema.parse(input.email);
    const password = passwordSchema.parse(input.password);
    if (await this.repository.findUserByEmail(email)) {
      throw new ApiError(409, 'IDENTITY_EMAIL_EXISTS', '邮箱已被使用');
    }
    try {
      return await this.repository.createUser(
        {
          email,
          displayName: input.displayName,
          passwordHash: await hashPassword(password),
          emailVerified: input.emailVerified ?? false,
        },
        context.executor,
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ApiError(409, 'IDENTITY_EMAIL_EXISTS', '邮箱已被使用');
      }
      throw error;
    }
  }

  async updateUser(input: {
    userId: string;
    displayName?: string | null;
    status?: 'active' | 'disabled';
  }): Promise<PublicIdentityUser> {
    const user = await this.repository.updateUser(input);
    if (!user) throw new ApiError(404, 'IDENTITY_USER_NOT_FOUND', '账号不存在');
    return user;
  }

  private digestMatches(value: string, expectedDigest: string): boolean {
    const actual = Buffer.from(digest(value));
    const expected = Buffer.from(expectedDigest);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private actionTokenExpiry(): Date {
    return new Date(Date.now() + this.environment.AUTH_ACTION_TOKEN_TTL_SECONDS * 1000);
  }

  private exposedActionToken(actionToken: string): { accepted: true; testToken?: string } {
    return this.environment.AUTH_EXPOSE_TEST_TOKENS
      ? { accepted: true, testToken: actionToken }
      : { accepted: true };
  }

  private isUniqueViolation(error: unknown): boolean {
    let current = error;
    for (let depth = 0; depth < 3; depth += 1) {
      if (typeof current !== 'object' || current === null) return false;
      if ('code' in current && (current as { code?: unknown }).code === '23505') return true;
      current = 'cause' in current ? (current as { cause?: unknown }).cause : undefined;
    }
    return false;
  }
}
