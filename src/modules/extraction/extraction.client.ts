import { Ollama } from 'ollama';

import { env } from '../../config/env.js';

const client = new Ollama({ host: env.OLLAMA_BASE_URL });

export async function generateStructuredExtraction(prompt: string): Promise<string> {
  const response = await client.generate({
    model: env.OLLAMA_CHAT_MODEL,
    prompt,
    stream: false,
    format: 'json'
  });

  return response.response;
}