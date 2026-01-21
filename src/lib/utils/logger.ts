/**
 * Centralized logging utility
 * Respects environment (dev vs production) and prevents sensitive data leakage
 */

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Sensitive patterns that should never be logged
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /session/i,
  /credential/i,
];

/**
 * Check if a value contains sensitive information
 */
function containsSensitiveData(value: any): boolean {
  if (typeof value === 'string') {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
  }
  if (typeof value === 'object' && value !== null) {
    const stringified = JSON.stringify(value);
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(stringified));
  }
  return false;
}

/**
 * Sanitize a value by removing or masking sensitive data
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    if (containsSensitiveData(value)) {
      return '[REDACTED]';
    }
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    const sanitized: any = Array.isArray(value) ? [] : {};
    for (const key in value) {
      if (containsSensitiveData(key) || containsSensitiveData(value[key])) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value[key] === 'object' && value[key] !== null) {
        sanitized[key] = sanitizeValue(value[key]);
      } else {
        sanitized[key] = value[key];
      }
    }
    return sanitized;
  }
  return value;
}

/**
 * Logger interface
 */
interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

/**
 * Create a logger instance
 */
function createLogger(prefix?: string): Logger {
  const prefixStr = prefix ? `[${prefix}]` : '';

  const log = (...args: any[]): void => {
    if (!isDevelopment) return; // Only log in development
    const sanitized = args.map(sanitizeValue);
    console.log(prefixStr, ...sanitized);
  };

  const error = (...args: any[]): void => {
    // Always log errors, but sanitize in production
    const sanitized = isDevelopment ? args : args.map(sanitizeValue);
    console.error(prefixStr, ...sanitized);
  };

  const warn = (...args: any[]): void => {
    if (!isDevelopment) return; // Only log warnings in development
    const sanitized = args.map(sanitizeValue);
    console.warn(prefixStr, ...sanitized);
  };

  const info = (...args: any[]): void => {
    if (!isDevelopment) return; // Only log info in development
    const sanitized = args.map(sanitizeValue);
    console.info(prefixStr, ...sanitized);
  };

  const debug = (...args: any[]): void => {
    if (!isDevelopment) return; // Only log debug in development
    const sanitized = args.map(sanitizeValue);
    console.debug(prefixStr, ...sanitized);
  };

  return { log, error, warn, info, debug };
}

// Default logger
export const logger = createLogger();

// Create named loggers
export function createNamedLogger(name: string): Logger {
  return createLogger(name);
}

// Export sanitize function for manual use if needed
export { sanitizeValue, containsSensitiveData };
