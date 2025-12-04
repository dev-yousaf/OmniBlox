import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Better Auth attaches session data to request.session
    // The session includes our custom companyId field
    const session = request.session;

    if (!session || !session.companyId) {
      // Fallback to request.user for compatibility
      const user = request.user;
      if (user && user.companyId) {
        return user.companyId;
      }
      throw new Error('Company ID not found in session or user');
    }

    return session.companyId;
  },
);
