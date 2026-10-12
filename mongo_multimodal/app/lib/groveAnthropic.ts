import { createAnthropic } from '@ai-sdk/anthropic';

const apiKey = process.env.GROVE_API_KEY;

if (!apiKey) {
  throw new Error('Missing GROVE_API_KEY in .env.local');
}

export const anthropic = createAnthropic({
  apiKey,
  baseURL:
    'https://grove-gateway-prod.azure-api.net/grove-foundry-prod/anthropic/v1',
  headers: { 'api-key': apiKey },
});

