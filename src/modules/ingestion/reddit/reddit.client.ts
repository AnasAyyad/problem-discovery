import { AppError } from '../../../lib/errors.js';
import { env } from '../../../config/env.js';

interface RedditTokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: RedditTokenCache | null = null;

function hasRedditCredentials(): boolean {
  return Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET);
}

async function getRedditAccessToken(): Promise<string | null> {
  if (!hasRedditCredentials()) {
    return null;
  }

  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': env.REDDIT_USER_AGENT
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials'
    })
  });

  if (!response.ok) {
    throw new AppError(`Failed to obtain Reddit access token (${response.status})`, 502);
  }

  const payload = await response.json() as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token || !payload.expires_in) {
    throw new AppError('Reddit token response was missing required fields', 502, payload);
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 60) * 1000
  };

  return tokenCache.accessToken;
}

export async function fetchRedditJson(path: string): Promise<unknown> {
  const accessToken = await getRedditAccessToken();
  const baseUrl = accessToken ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'User-Agent': env.REDDIT_USER_AGENT,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    }
  });

  if (!response.ok) {
    if (response.status === 403 && !accessToken) {
      throw new AppError(
        'Reddit blocked unauthenticated access from this environment. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env and retry.',
        403
      );
    }

    throw new AppError(`Reddit request failed with status ${response.status}`, response.status);
  }

  return response.json();
}