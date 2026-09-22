import { Request } from 'express';

export type TokenPayload = {
  sub: string;
};

export type RequestWithUser = Request & {
  user?: number;
};

export type AuthenticatedRequest = RequestWithUser & {
  user: number;
};
