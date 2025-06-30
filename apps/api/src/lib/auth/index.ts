export type { SessionUser, SessionWithUser, SessionValidationResult } from './config.js';

export {
  AUTH_COOKIE_NAME,
  isSecureContext,
  validateSessionToken,
  validateCredentials,
  signInWithCredentials,
} from './config.js';

export { generateRandomPassword } from './utils.js';
