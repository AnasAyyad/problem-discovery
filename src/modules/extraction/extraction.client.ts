import { createOllamaClient } from "../../lib/ollama-client.js";
import { env } from "../../config/env.js";

export async function generateStructuredExtraction(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const client = createOllamaClient(signal);
  const response = await client.generate({
    model: env.OLLAMA_CHAT_MODEL,
    prompt,
    stream: false,
    format: "json",
  });

  return response.response;
}
