import { afterEach, describe, expect, it } from 'vitest'

import { getAppConfig } from '~/server/utils/config'

describe('getAppConfig discord webhook', () => {
  afterEach(() => {
    delete globalThis.__env__
  })

  it('resolves the webhook URL from the Cloudflare binding', () => {
    globalThis.__env__ = {
      NUXT_DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123/secret',
    }

    expect(getAppConfig().discordWebhookUrl).toBe(
      'https://discord.com/api/webhooks/123/secret',
    )
  })

  it('resolves to an empty string when the URL is absent, disabling the notifier', () => {
    expect(getAppConfig().discordWebhookUrl).toBe('')
  })

})