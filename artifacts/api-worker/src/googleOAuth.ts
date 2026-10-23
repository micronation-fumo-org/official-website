export interface GoogleIdentity {
  subject: string;
  email: string;
}

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(byteLength = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function createPkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function buildGoogleAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string,
): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

interface GoogleTokenResponse {
  access_token?: unknown;
}

interface GoogleUserInfo {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
}

export async function fetchGoogleIdentity(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<GoogleIdentity | null> {
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });
    if (!tokenResponse.ok) return null;

    const tokens = await tokenResponse.json() as GoogleTokenResponse;
    if (typeof tokens.access_token !== "string" || !tokens.access_token) return null;

    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    });
    if (!userInfoResponse.ok) return null;

    const userInfo = await userInfoResponse.json() as GoogleUserInfo;
    if (
      typeof userInfo.sub !== "string" || !userInfo.sub || userInfo.sub.length > 255 ||
      typeof userInfo.email !== "string" || !userInfo.email || userInfo.email.length > 320 ||
      userInfo.email_verified !== true
    ) return null;

    return {
      subject: userInfo.sub,
      email: userInfo.email.trim().toLowerCase(),
    };
  } catch {
    // Never log authorization codes, tokens, or profile responses.
    return null;
  }
}
