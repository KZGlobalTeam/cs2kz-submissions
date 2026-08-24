export interface AuthUrls {
  realm: string
  returnUrl: string
}

/**
 * Steam OpenID URLs anchored to the origin serving the request.
 *
 * The Steam login dance hands the browser to Steam and back to
 * `openid.return_to`. If that callback host differs from the host the user is
 * actually browsing (custom domain, `*.pages.dev`, or a preview deployment),
 * the session cookie gets set for the wrong host and the user is silently
 * logged out again — they end up re-signing-in constantly.
 *
 * Deriving these from the request origin keeps the callback — and therefore
 * the session cookie it sets — on the same host the user is browsing.
 */
export function buildAuthUrls(origin: string): AuthUrls {
  const base = origin.replace(/\/+$/, '')
  return {
    realm: `${base}/`,
    returnUrl: `${base}/api/auth/callback`,
  }
}