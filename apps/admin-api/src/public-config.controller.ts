import { Controller, Get } from '@nestjs/common';

@Controller('public/runtime-config')
export class PublicConfigController {
  @Get()
  getRuntimeConfig() {
    return {
      registrationEnabled: process.env.LXP_REGISTRATION_ENABLED === 'true',
      forgotPasswordEnabled: process.env.LXP_FORGOT_PASSWORD_ENABLED === 'true',
      gatewayOnline: process.env.LXP_GATEWAY_ONLINE !== 'false',
      supportedProviders: [
        {
          providerId: 'nanogpt',
          displayName: 'NanoGPT',
        },
        {
          providerId: 'openrouter',
          displayName: 'OpenRouter',
        },
        {
          providerId: 'ollama',
          displayName: 'Ollama',
        },
        {
          providerId: 'groq',
          displayName: 'Groq',
        },
        {
          providerId: 'google',
          displayName: 'Google Gemini',
        },
        {
          providerId: 'xai',
          displayName: 'xAI Grok',
        },
        {
          providerId: 'openai',
          displayName: 'OpenAI',
        },
        {
          providerId: 'anthropic',
          displayName: 'Anthropic Claude',
        },
      ],
    };
  }
}
