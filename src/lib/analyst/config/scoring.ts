export const STANCE_THRESHOLDS = {
  proRussia: 0.2,
  antiRussia: -0.2,
} as const;

export const NARRATIVE_SCORING = {
  latinTermWeight: 3,
  longSpecificTermWeight: 2,
  defaultTermWeight: 1,
  strongMatchThreshold: 2,
  fallbackLimit: 20,
  minimumStrongItems: 8,
  broadTerms: ['газ', 'транзит'],
} as const;

export const ENTITY_SCORING = {
  minTermLength: 2,
  longTermLength: 5,
  longTermWeight: 2,
  shortTermWeight: 1,
  singleTermThreshold: 2,
  multiTermMatchedThreshold: 2,
  multiTermScoreThreshold: 3,
} as const;

export const TEMPORAL_SCORING = {
  lexical: {
    longTermWeight: 1.2,
    shortTermWeight: 0.8,
    normalizationFloor: 2,
    normalizationFactor: 1.2,
  },
  rerankWeights: {
    lexical: 0.26,
    vector: 0.22,
    graph: 0.18,
    temporal: 0.12,
    consistency: 0.10,
    centrality: 0.07,
    trust: 0.05,
  },
  consistencyWeights: {
    sentiment: 0.7,
    sourceFrequency: 0.3,
  },
  gates: {
    candidateScore: 0.18,
    lexicalWhy: 0.35,
    vectorWhy: 0.35,
  },
} as const;

export const TEMPORAL_RULES = {
  vectorDimensions: 64,
  graph: {
    centralityDegreeNormalization: 8,
    entityCoverageNormalization: 3,
  },
  freshness: {
    day1: 1,
    week1: 0.85,
    month1: 0.65,
    older: 0.45,
  },
  windows: {
    shortRangeDays: 10,
    recentSliceDays: 7,
    recentWeight: 1.1,
    baselineWeight: 0.9,
  },
  limits: {
    defaultTimelineLimit: 120,
  },
  confidence: {
    floor: 0.35,
    ceil: 0.99,
  },
} as const;
