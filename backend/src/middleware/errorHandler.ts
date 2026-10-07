import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const reqId = (req as any).requestId || req.headers['x-request-id'] || 'req-err';
  console.error(`[Error] [${reqId}]`, err);

  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected internal server error occurred';

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: reqId,
    },
  });
}
