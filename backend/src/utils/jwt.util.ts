import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.config.js';
import { IUserDocument } from '../interfaces/user.interface.js';

export interface JwtTokenPayload {
  id: string;
  email: string;
  role: string;
  name: string;
}

export class JwtUtil {
  static generateTokens(user: IUserDocument): { accessToken: string; refreshToken: string } {
    const payload: JwtTokenPayload = {
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = jwt.sign(payload, ENV.JWT.ACCESS_SECRET, {
      expiresIn: ENV.JWT.ACCESS_EXPIRY as any,
    });

    const refreshToken = jwt.sign({ id: payload.id }, ENV.JWT.REFRESH_SECRET, {
      expiresIn: ENV.JWT.REFRESH_EXPIRY as any,
    });

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): JwtTokenPayload {
    return jwt.verify(token, ENV.JWT.ACCESS_SECRET) as JwtTokenPayload;
  }

  static verifyRefreshToken(token: string): { id: string } {
    return jwt.verify(token, ENV.JWT.REFRESH_SECRET) as { id: string };
  }
}
