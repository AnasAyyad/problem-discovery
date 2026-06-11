import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';

export async function fetchProductHuntPosts(limit = 10): Promise<unknown[]> {
  if (!env.PRODUCT_HUNT_TOKEN) {
    throw new AppError('Missing PRODUCT_HUNT_TOKEN', 400);
  }

  const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.PRODUCT_HUNT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': env.INGEST_USER_AGENT
    },
    body: JSON.stringify({
      query: `
        query GetPosts($first: Int!) {
          posts(first: $first) {
            edges {
              node {
                id
                name
                tagline
                votesCount
                createdAt
                website
              }
            }
          }
        }
      `,
      variables: {
        first: limit
      }
    })
  });

  if (!response.ok) {
    throw new AppError(`Product Hunt request failed with status ${response.status}`, response.status);
  }

  const payload = await response.json() as {
    data?: {
      posts?: {
        edges?: Array<{ node?: unknown }>;
      };
    };
  };

  return payload.data?.posts?.edges?.map((edge) => edge.node).filter(Boolean) ?? [];
}
