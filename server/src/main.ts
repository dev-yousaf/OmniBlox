import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser'; // Import cookie-parser correctly
import { LoggingMiddleware } from './common/logging.middleware';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables from .env (if present)
dotenv.config();

async function bootstrap() {
  // Disable built-in body parser (Better Auth handles raw bodies)
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Initialize database connection check
  const databaseUrl =
    process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      '[main.ts] DATABASE_URL is not set. Skipping database connection check.',
    );
  } else {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    try {
      // Perform a simple database connection check
      await prisma.$connect();

      // Test with a simple query to verify connection
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log(
        '[main.ts] Database connection successful. Test query result:',
        result,
      );

      await prisma.$disconnect();
    } catch (error) {
      console.error(
        '[main.ts] Database connection check failed:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // Add this CORS configuration
  app.enableCors({
    origin: [process.env.CORS_ORIGIN || 'http://localhost:3000'].filter(
      Boolean,
    ),
    credentials: true, // This is crucial for sending cookies
  });

  // Add cookie parser middleware
  app.use(cookieParser());

  // Suppress harmless Chrome DevTools .well-known requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/.well-known/')) {
      return res.status(204).end();
    }
    next();
  });

  // Register logging middleware early so all requests/responses are captured
  const loggingMiddleware = new LoggingMiddleware();
  app.use((req, res, next) => loggingMiddleware.use(req, res, next));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = process.env.PORT || 5005;
  await app.listen(port);
  console.log('[main.ts] Application is running on:', port);
}
bootstrap();
