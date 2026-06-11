import { env } from '../../config/env.js';

export function parseDiscoveryKeywords(value: string): string[] {
  return value
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);
}

export function getDiscoveryKeywords(override?: string[]): string[] {
  if (override && override.length > 0) {
    return override;
  }

  const configuredKeywords = env.DISCOVERY_KEYWORDS || env.HN_SEARCH_TERMS || '';
  return parseDiscoveryKeywords(configuredKeywords);
}
