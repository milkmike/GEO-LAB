export type ValidationDecision = 'core' | 'context' | 'noise';
export type ValidationSameThread = 'yes' | 'no';
export type ValidationReasonCode =
  | 'actor_mismatch'
  | 'topic_mismatch'
  | 'geo_mismatch'
  | 'time_mismatch'
  | 'too_generic'
  | 'other'
  | '';

export type ValidationRow = {
  batch_id: string;
  row_id: number;
  created_at_utc: string;
  focal_country: string;
  country_code: string;
  thread_id: number;
  thread_title: string;
  thread_key: string;
  focus_question: string;
  article_id: number;
  published_at: string;
  source: string;
  tier: string;
  event_type: string;
  action_level: number | string;
  sentiment: number | string;
  title: string;
  url: string;
  validator_decision: string;
  same_thread: string;
  reason_code: string;
  confidence: string;
  notes: string;
};

export type ValidationAnswer = {
  rowId: number;
  validatorDecision: ValidationDecision | '';
  sameThread: ValidationSameThread | '';
  reasonCode: ValidationReasonCode;
  confidence: '' | 1 | 2 | 3;
  notes: string;
  updatedAt: string;
};
