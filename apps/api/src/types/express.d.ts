// Type overrides to resolve Express interface conflicts with Node.js IncomingMessage
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string | number;
    requestId?: string;
  }
}

export {};
