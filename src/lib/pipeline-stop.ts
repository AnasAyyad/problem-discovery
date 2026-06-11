export const PIPELINE_STOP_MESSAGE = "Pipeline stop requested";

export function createPipelineStopError(): Error {
  const error = new Error(PIPELINE_STOP_MESSAGE);
  error.name = "PipelineStopError";
  return error;
}

export function isPipelineStopError(error: unknown): boolean {
  return error instanceof Error && error.message === PIPELINE_STOP_MESSAGE;
}

export function createStopMonitor(
  shouldStop: (() => Promise<boolean>) | undefined,
  abortController: AbortController,
  intervalMs = 250,
): () => void {
  if (!shouldStop) {
    return () => {};
  }

  const timer = setInterval(async () => {
    if (abortController.signal.aborted) {
      clearInterval(timer);
      return;
    }

    try {
      if (await shouldStop()) {
        abortController.abort(createPipelineStopError());
        clearInterval(timer);
      }
    } catch {
      clearInterval(timer);
    }
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return () => clearInterval(timer);
}
