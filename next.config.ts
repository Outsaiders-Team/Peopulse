import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ensure the system prompt ships with the serverless function bundle.
  outputFileTracingIncludes: {
    '/api/upload-csv': ['./prompts/llm_prompt.md'],
  },
  // Skip Next's auto-generated AGENTS.md/CLAUDE.md; this repo manages its own docs.
  agentRules: false,
};

export default nextConfig;
