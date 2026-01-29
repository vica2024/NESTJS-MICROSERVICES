import crypto from 'crypto';

export function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
