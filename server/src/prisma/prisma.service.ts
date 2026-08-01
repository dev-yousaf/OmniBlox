import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // The 'super' call invokes the constructor of the PrismaClient.
    // We pass it a configuration object to override the default datasource URL.
    //
    // Prefer the true direct URL. The pooled URLs (DATABASE_URL /
    // DATABASE_URL_POOLED) both carry `pgbouncer=true`, i.e. they are routed
    // through Supabase's TRANSACTION-mode pooler, which cannot host Prisma
    // interactive transactions or raw queries reliably (intermittent
    // "Transaction API error: Transaction not found"). This app is a
    // long-lived process (not serverless), so the direct connection is the
    // correct datasource.
    const databaseUrl =
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      process.env.DATABASE_URL_POOLED;

    if (databaseUrl) {
      // If a runtime database URL is available, pass it explicitly to Prisma.
      //
      // Supabase's session-mode pooler caps concurrent clients at pool_size
      // (15 for this project). Prisma's default pool (2*cores+1) can exceed
      // that, so parallel dashboard queries (22 concurrent) blow the pooler
      // limit with FATAL: (EMAXCONNSESSION) max clients reached in session
      // mode. Capping connection_limit keeps the client below the pooler
      // ceiling; excess queries queue client-side instead of erroring.
      const url = new URL(databaseUrl);
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '8');
      }

      super({
        datasources: {
          db: {
            url: url.toString(),
          },
        },
        log: ['error', 'warn'],
        // Interactive transactions default to a 5s timeout and 2s maxWait,
        // which is too tight for multi-query mutations (variant batch create,
        // purchase returns, ...) on slower connections — the transaction dies
        // mid-flight with "Transaction already closed / timeout was 5000 ms".
        transactionOptions: {
          maxWait: 20_000,
          timeout: 60_000,
        },
        // Add connection timeout and pool settings for Neon
        // This helps with auto-suspend/wake scenarios
        __internal: {
          engine: {
            connect_timeout: 20, // 20 seconds timeout
          },
        },
      });
    } else {
      // If no DB URL is provided, avoid passing `undefined` to PrismaClient.
      // Let Prisma use its default behavior (read from `schema.prisma` env()).
      console.warn(
        '[PrismaService] No DIRECT_URL / DATABASE_URL / DATABASE_URL_POOLED found; creating PrismaClient without explicit datasource override.',
      );

      super();
    }
  }

  async onModuleInit() {
    // Retry connection up to 3 times to handle Neon auto-suspend
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[PrismaService] Connecting to database (attempt ${attempt}/${maxRetries})...`,
        );
        await this.$connect();
        console.log(
          '[PrismaService] Database connected successfully (using pooled connection)',
        );
        return; // Success, exit the function
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[PrismaService] Connection attempt ${attempt}/${maxRetries} failed:`,
          lastError.message,
        );

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
          console.log(
            `[PrismaService] Retrying in ${waitTime / 1000} seconds...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    console.error(
      '[PrismaService] Failed to connect to database after',
      maxRetries,
      'attempts:',
      lastError?.message,
    );
    console.error(
      '[PrismaService] The application will continue, but database operations may fail.',
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('[PrismaService] Database disconnected');
  }
}
