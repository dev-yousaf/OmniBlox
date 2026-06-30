import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    const session = request.session;
    const companyId = session?.user?.companyId;

    if (!companyId) {
      throw new Error('Company ID not found in session');
    }

    return companyId;
  },
);
