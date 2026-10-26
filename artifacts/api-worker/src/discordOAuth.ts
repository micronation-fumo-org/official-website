export interface DiscordIdentity {
  subject: string;
  username: string;
  globalName: string;
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

export function buildDiscordAuthorizationUrl(clientId: string, redirectUri: string, state: string, codeChallenge: string): string {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  }).toString();
  return url.toString();
}

interface DiscordTokenResponse { access_token?: unknown; }
interface DiscordUserResponse { id?: unknown; username?: unknown; global_name?: unknown; }

export async function fetchDiscordIdentity(code: string, codeVerifier: string, clientId: string, clientSecret: string, redirectUri: string): Promise<DiscordIdentity | null> {
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: codeVerifier }),
    });
    if (!tokenResponse.ok) return null;
    const tokens = await tokenResponse.json() as DiscordTokenResponse;
    if (typeof tokens.access_token !== "string" || !tokens.access_token) return null;
    const response = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" } });
    if (!response.ok) return null;
    const user = await response.json() as DiscordUserResponse;
    if (typeof user.id !== "string" || !/^\d{15,25}$/.test(user.id) || typeof user.username !== "string" || !user.username) return null;
    return { subject: user.id, username: user.username.slice(0, 100), globalName: typeof user.global_name === "string" ? user.global_name.slice(0, 100) : "" };
  } catch {
    return null;
  }
}
