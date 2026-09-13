import type { AnalysisResult } from './types';

/** Flip to true to exercise the UI/loading flow without calling the LLM. */
export const USE_SAMPLE_ANALYSIS = false;

export const SAMPLE_ANALYSIS: AnalysisResult = {
  status: 'success',
  filename: 'sample-feedback.csv',
  rows_detected: 48,
  analysis: {
    top_themes: [
      { text: 'Residents want faster response times on barangay service requests.', sentiment: 'negative' },
      { text: 'Many praise recent cleanliness and drainage improvements.', sentiment: 'positive' },
      { text: 'Communication about schedule changes remains a recurring pain point.', sentiment: 'negative' },
    ],
    pulse_themes: [
      {
        label: 'Faster service requests',
        sentiment: 'positive',
        intensity: 'medium',
        count: 18,
        share: 0.375,
        example_responses: ['Simple permits are processed within the day more often.', 'The service desk is much faster now.'],
      },
      {
        label: 'Delayed follow-up',
        sentiment: 'negative',
        intensity: 'high',
        count: 14,
        share: 0.2917,
        example_responses: ['Complaint tickets take too long before anyone follows up.', 'Field repair crews miss promised dates.'],
      },
      {
        label: 'Cleaner streets and drainage',
        sentiment: 'positive',
        intensity: 'low',
        count: 9,
        share: 0.1875,
        example_responses: ['Street cleaning and drainage work has visibly improved.'],
      },
      {
        label: 'Unclear schedule notices',
        sentiment: 'negative',
        intensity: 'medium',
        count: 7,
        share: 0.1458,
        example_responses: ['Schedule changes for services are announced too late.'],
      },
    ],
    questions: [
      {
        question: 'What do you appreciate most about our current services?',
        summary:
          'People mainly praise cleaner streets, friendlier frontline staff, and faster processing for common permits.',
        heard_often: [
          { text: 'Street cleaning and drainage work has visibly improved.', sentiment: 'positive' },
          { text: 'Staff at the help desk are more approachable than before.', sentiment: 'positive' },
          { text: 'Simple permits are processed within the day more often.', sentiment: 'positive' },
        ],
        also_worth_noting: [
          { text: 'A few residents mentioned helpful SMS reminders for appointments.', sentiment: 'positive' },
        ],
      },
      {
        question: 'What challenges or issues have you experienced?',
        summary:
          'The biggest frustrations are slow follow-up on complaints, unclear schedule notices, and long waits for field repairs.',
        heard_often: [
          { text: 'Complaint tickets take too long before anyone follows up.', sentiment: 'negative' },
          { text: 'Schedule changes for services are announced too late.', sentiment: 'negative' },
          { text: 'Field repair crews arrive late or miss promised dates.', sentiment: 'negative' },
        ],
        also_worth_noting: [
          { text: 'One person reported being transferred between offices with no resolution.', sentiment: 'negative' },
          { text: 'A resident noted the online form sometimes rejects valid IDs.', sentiment: 'negative' },
        ],
      },
      {
        question: 'Any other comments or suggestions?',
        summary:
          'Suggestions mix appreciation for recent upgrades with requests for clearer status updates and weekend service windows.',
        heard_often: [
          { text: 'Publish a simple status tracker for open requests.', sentiment: 'positive' },
          { text: 'Weekend hours would help working residents.', sentiment: 'positive' },
        ],
        also_worth_noting: [
          { text: 'Hotline hold times were called out as still too long.', sentiment: 'negative' },
        ],
      },
    ],
  },
};

/** Mimics a short API wait so the loading UI still exercises. */
export function fetchSampleAnalysis(delayMs = 10000): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(SAMPLE_ANALYSIS), delayMs);
  });
}
