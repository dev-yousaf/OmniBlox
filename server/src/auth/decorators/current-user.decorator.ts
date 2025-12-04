import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentCompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.companyId) {
      throw new Error('Company ID not found in request user');
    }

    return user.companyId;
  },
);

export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return that property
    if (data) {
      return user?.[data];
    }

    // Otherwise return the whole user object
    return user;
  },
);

export const GetCurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new Error('User ID not found in request user');
    }

    return user.id;
  },
);
