const DEFAULT_API_URL = 'http://localhost:3000';

export function getApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  const url = configured && configured.length > 0 ? configured : DEFAULT_API_URL;
  return url.replace(/\/$/, '');
}
