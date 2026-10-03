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
describe('getAppConfig discord server operator role ids', () => {
  afterEach(() => {
    delete globalThis.__env__
  })

  it('resolves each game’s role id from the Cloudflare binding', () => {
    globalThis.__env__ = {
      NUXT_DISCORD_CS2_SERVER_OPERATOR_ROLE_ID: '111',
      NUXT_DISCORD_CSGO_SERVER_OPERATOR_ROLE_ID: '222',
    }

    const config = getAppConfig()
    expect(config.discordCs2ServerOperatorRoleId).toBe('111')
    expect(config.discordCsgoServerOperatorRoleId).toBe('222')
  })

  it('resolves to empty strings when absent, falling back to plain-text mentions', () => {
    const config = getAppConfig()
    expect(config.discordCs2ServerOperatorRoleId).toBe('')
    expect(config.discordCsgoServerOperatorRoleId).toBe('')
  })
})
