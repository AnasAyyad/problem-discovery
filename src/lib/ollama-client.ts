import { Ollama } from "ollama";

import { env } from "../config/env.js";

function combineAbortSignals(signals: AbortSignal[]): AbortSignal | undefined {
  if (signals.length === 0) {
    return undefined;
  }

  if (signals.length === 1) {
    return signals[0];
  }

  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }

  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener(
      "abort",
      () => {
        if (!controller.signal.aborted) {
          controller.abort(signal.reason);
        }
      },
      { once: true },
    );
  }

  return controller.signal;
}

export function createOllamaClient(signal?: AbortSignal): Ollama {
  return new Ollama({
    host: env.OLLAMA_BASE_URL,
    fetch: (input, init) => {
      const signals: AbortSignal[] = [];

      if (init?.signal) {
        signals.push(init.signal);
      }

      if (signal) {
        signals.push(signal);
      }

      if (env.OLLAMA_REQUEST_TIMEOUT_MS > 0) {
        signals.push(AbortSignal.timeout(env.OLLAMA_REQUEST_TIMEOUT_MS));
      }

      const combinedSignal = combineAbortSignals(signals);

      return fetch(input, {
        ...init,
        ...(combinedSignal ? { signal: combinedSignal } : {}),
      });
    },
  });
}
