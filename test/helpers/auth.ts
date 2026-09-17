import type { JwtModuleOptions } from '@nestjs/jwt';

export const TEST_ACCESS_SECRET = 'test-only-access-secret';
export const TEST_REFRESH_SECRET = 'test-only-refresh-secret';

export const testJwtOptions: JwtModuleOptions = {
  secret: TEST_ACCESS_SECRET,
  signOptions: { expiresIn: '24h', algorithm: 'HS256' },
  verifyOptions: { algorithms: ['HS256'] },
};
