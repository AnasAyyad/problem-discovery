export interface PipelineStepSummary {
  name: string;
  status: 'completed';
  meta: Record<string, unknown>;
}

export interface PipelineRunSummary {
  subreddit: string;
  steps: PipelineStepSummary[];
  startedAt: string;
  finishedAt: string;
}