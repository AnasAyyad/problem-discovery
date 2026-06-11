import { Ollama } from 'ollama';

import { env } from '../../config/env.js';

const client = new Ollama({ host: env.OLLAMA_BASE_URL });

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await client.embeddings({
    model: env.OLLAMA_EMBED_MODEL,
    prompt: text
  });

  return response.embedding;
}