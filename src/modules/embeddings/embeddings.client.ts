import { env } from "../../config/env.js";
import { createOllamaClient } from "../../lib/ollama-client.js";

export async function createEmbedding(
  text: string,
  signal?: AbortSignal,
): Promise<number[]> {
  const client = createOllamaClient(signal);
  const response = await client.embeddings({
    model: env.OLLAMA_EMBED_MODEL,
    prompt: text,
  });

  return response.embedding;
}
