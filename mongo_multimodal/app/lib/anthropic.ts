import { createAnthropic } from '@ai-sdk/anthropic';

const groveKey = process.env.GROVE_API_KEY ?? '';

export const anthropic = createAnthropic({
  apiKey: groveKey,
  baseURL:
    'https://grove-gateway-prod.azure-api.net/grove-foundry-prod/anthropic/v1',
  headers: { 'api-key': groveKey },
});

