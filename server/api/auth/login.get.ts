import { sendRedirect } from 'h3'

import { getSteamLoginUrl } from '~/server/utils/steam-openid'

export default defineEventHandler(async (event) => {
  const loginUrl = await getSteamLoginUrl(event)
  return sendRedirect(event, loginUrl, 302)
})
