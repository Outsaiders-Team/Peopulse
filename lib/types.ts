export type Sentiment = 'positive' | 'negative';

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

export type AnalysisPayload = {
  top_themes: AnalysisPoint[];
  questions: QuestionAnalysis[];
};

export type AnalysisResult = {
  status: 'success';
  filename: string;
  rows_detected: number;
  analysis: AnalysisPayload;
};

export type ApiErrorBody = { detail: string };
