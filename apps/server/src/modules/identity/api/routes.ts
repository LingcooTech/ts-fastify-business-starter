import type { CookieSerializeOptions } from '@fastify/cookie';
import { ApiError } from '@lingcoo-tech/http';
import {
  changePasswordRequestSchema,
  confirmEmailVerificationSchema,
  confirmPasswordResetSchema,
  loginRequestSchema,
  requestPasswordResetSchema,
} from '@ts-fastify-business-starter/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { AppEnvironment } from '../../../config/environment.js';
import type { IdentityService } from '../application/identity.service.js';
import type { PublicIdentitySession, PublicIdentityUser } from '../domain/model.js';
import './request-context.js';

interface IdentityRouteDependencies {
  environment: AppEnvironment;
  service: IdentityService;
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', '请求参数校验失败', z.flattenError(result.error));
  }
  return result.data;
}

function serializeUser(user: PublicIdentityUser) {
  return {
    ...user,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function serializeSession(session: PublicIdentitySession) {
  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function registerIdentityRoutes(
  app: FastifyInstance,
  dependencies: IdentityRouteDependencies,
): Promise<void> {
  const { environment, service } = dependencies;
  const cookieOptions = (httpOnly: boolean): CookieSerializeOptions => ({
    httpOnly,
    sameSite: environment.AUTH_COOKIE_SAME_SITE,
    secure: environment.AUTH_COOKIE_SECURE,
    path: '/',
    maxAge: environment.AUTH_SESSION_TTL_SECONDS,
  });
  const clearCookies = (reply: FastifyReply): void => {
    reply.clearCookie(environment.AUTH_COOKIE_NAME, cookieOptions(true));
    reply.clearCookie(environment.AUTH_CSRF_COOKIE_NAME, cookieOptions(false));
  };
  const requireIdentity = async (request: FastifyRequest) => {
    const sessionToken = request.cookies[environment.AUTH_COOKIE_NAME];
    const csrfToken = request.cookies[environment.AUTH_CSRF_COOKIE_NAME];
    if (!sessionToken || !csrfToken) {
      throw new ApiError(401, 'AUTHENTICATION_REQUIRED', '请先登录');
    }
    const session = await service.resolveSession(sessionToken, csrfToken);
    if (!session) throw new ApiError(401, 'INVALID_SESSION', '登录状态已失效');
    request.identityPrincipal = { ...session, csrfToken };
  };
  const requireCsrf = async (request: FastifyRequest) => {
    await requireIdentity(request);
    const principal = request.identityPrincipal;
    const csrfHeader = firstHeader(request.headers['x-csrf-token']);
    if (!principal || !csrfHeader || !service.csrfMatches(csrfHeader, principal.csrfToken)) {
      throw new ApiError(403, 'INVALID_CSRF_TOKEN', 'CSRF 令牌无效');
    }
  };
  const loginRateLimit = app.rateLimit({
    max: 10,
    timeWindow: '1 minute',
  });
  const passwordResetRequestRateLimit = app.rateLimit({
    max: 5,
    timeWindow: '1 minute',
  });
  const passwordResetConfirmRateLimit = app.rateLimit({
    max: 10,
    timeWindow: '1 minute',
  });
  const emailVerificationRequestRateLimit = app.rateLimit({
    max: 5,
    timeWindow: '1 minute',
  });
  const emailVerificationConfirmRateLimit = app.rateLimit({
    max: 10,
    timeWindow: '1 minute',
  });

  app.post('/api/auth/login', { preHandler: loginRateLimit }, async (request, reply) => {
    const input = parse(loginRequestSchema, request.body);
    const userAgent = firstHeader(request.headers['user-agent'])?.slice(0, 512) ?? null;
    const result = await service.login(input, {
      userAgent,
      ipAddress: request.ip?.slice(0, 64) ?? null,
    });
    reply.setCookie(environment.AUTH_COOKIE_NAME, result.sessionToken, cookieOptions(true));
    reply.setCookie(environment.AUTH_CSRF_COOKIE_NAME, result.csrfToken, cookieOptions(false));
    return {
      user: serializeUser(result.user),
      session: { id: result.sessionId, expiresAt: result.expiresAt.toISOString() },
      csrfToken: result.csrfToken,
    };
  });

  app.get('/api/auth/me', { preHandler: requireIdentity }, async (request) => {
    const principal = request.identityPrincipal!;
    return {
      user: serializeUser(principal.user),
      session: { id: principal.sessionId, expiresAt: principal.expiresAt.toISOString() },
      csrfToken: principal.csrfToken,
    };
  });

  app.post('/api/auth/logout', { preHandler: requireCsrf }, async (request, reply) => {
    await service.logout(request.identityPrincipal!.sessionId);
    clearCookies(reply);
    return { accepted: true } as const;
  });

  app.post('/api/auth/password/change', { preHandler: requireCsrf }, async (request, reply) => {
    const input = parse(changePasswordRequestSchema, request.body);
    await service.changePassword(request.identityPrincipal!.user.id, input);
    clearCookies(reply);
    return { accepted: true } as const;
  });

  app.post(
    '/api/auth/password-reset/request',
    { preHandler: passwordResetRequestRateLimit },
    async (request) => {
      const input = parse(requestPasswordResetSchema, request.body);
      return service.requestPasswordReset(input.email);
    },
  );

  app.post(
    '/api/auth/password-reset/confirm',
    { preHandler: passwordResetConfirmRateLimit },
    async (request) => {
      await service.confirmPasswordReset(parse(confirmPasswordResetSchema, request.body));
      return { accepted: true } as const;
    },
  );

  app.post(
    '/api/auth/email-verification/request',
    {
      preHandler: [emailVerificationRequestRateLimit, requireCsrf],
    },
    async (request) => service.requestEmailVerification(request.identityPrincipal!.user.id),
  );

  app.post(
    '/api/auth/email-verification/confirm',
    { preHandler: emailVerificationConfirmRateLimit },
    async (request) => {
      const input = parse(confirmEmailVerificationSchema, request.body);
      await service.confirmEmailVerification(input.token);
      return { accepted: true } as const;
    },
  );

  app.get('/api/auth/sessions', { preHandler: requireIdentity }, async (request) => ({
    items: (
      await service.listSessions(
        request.identityPrincipal!.user.id,
        request.identityPrincipal!.sessionId,
      )
    ).map(serializeSession),
  }));

  app.post('/api/auth/sessions/:sessionId/revoke', { preHandler: requireCsrf }, async (request) => {
    const { sessionId } = parse(z.object({ sessionId: z.uuid() }), request.params);
    const principal = request.identityPrincipal!;
    await service.revokeSession(principal.user.id, sessionId, principal.sessionId);
    return { accepted: true } as const;
  });
}
