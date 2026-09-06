export type Sentiment = 'positive' | 'negative';

export type Intensity = 'low' | 'medium' | 'high';

export type AnalysisPoint = {
  text: string;
  sentiment: Sentiment;
};

export type QuestionAnalysis = {
  question: string;
  summary: string;
  heard_often: AnalysisPoint[];
  also_worth_noting: AnalysisPoint[];
};

export type Recommendation = {
  priority: number;
  action: string;
  reason: string;
  timeframe: 'Immediate' | 'Short-term' | 'Long-term';
  target: string;
};

export type Recommendations = {
  overall_assessment: string;
  key_issue: {
    title: string;
    explanation: string;
  };
  recommendations: Recommendation[];
  monitoring_metrics: string[];
  data_limitations: string[];
};

export type PulseTheme = {
  label: string;
  sentiment: Sentiment;
  intensity: Intensity;
  count: number;
  share: number;
  example_responses: string[];
};

export type AnalysisPayload = {
  top_themes: AnalysisPoint[];
  questions: QuestionAnalysis[];
  pulse_themes: PulseTheme[];
  suggestions?: Recommendations;
};

export type AnalysisResult = {
  status: 'success';
  filename: string;
  rows_detected: number;
  analysis: AnalysisPayload;
};

export type ApiErrorBody = { detail: string };
