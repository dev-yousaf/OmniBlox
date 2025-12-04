import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { maskSensitive } from './logging.util';

function now() {
  return new Date().toISOString();
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      const started = Date.now();

      const safeReq = {
        method: req.method,
        path: req.originalUrl || req.url,
        headers: maskSensitive(req.headers),
        query: maskSensitive(req.query),
        body: maskSensitive(req.body),
        params: maskSensitive(req.params),
      };

      console.log(
        `[${now()}] [REQ] ${req.method} ${req.originalUrl} -`,
        safeReq,
      );

      // Capture response body
      const oldJson = res.json;
      const oldSend = res.send;

      let responseBody: any = undefined;

      // Override res.json

      (res as any).json = function (body: any) {
        responseBody = body;
        // call original
        return oldJson.call(this, body);
      };

      // Override res.send

      (res as any).send = function (body: any) {
        responseBody = body;
        return oldSend.call(this, body);
      };

      res.on('finish', () => {
        const took = Date.now() - started;
        const safeRes = {
          statusCode: res.statusCode,
          headers: maskSensitive(res.getHeaders ? res.getHeaders() : {}),
          body: maskSensitive(responseBody),
          durationMs: took,
        };
        console.log(
          `[${now()}] [RES] ${req.method} ${req.originalUrl} ${res.statusCode} -`,
          safeRes,
        );
      });

      next();
    } catch (err) {
      console.error('[LoggingMiddleware] error while logging request:', err);
      next();
    }
  }
}
