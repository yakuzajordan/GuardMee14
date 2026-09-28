import speakeasy from 'speakeasy';

export const generate2FASecret = (email) =>
  speakeasy.generateSecret({
    name: `GuardMee (${email})`,
    length: 20,
  });

export const verify2FAToken = (secret, token) =>
  speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 });
