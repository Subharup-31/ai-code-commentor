type NangoTokenResponse = string | { access_token?: string; token?: string } | null | undefined;

export function extractNangoAccessToken(token: NangoTokenResponse): string {
  if (typeof token === "string" && token.trim()) {
    return token;
  }

  if (token && typeof token === "object") {
    const accessToken = token.access_token ?? token.token;
    if (typeof accessToken === "string" && accessToken.trim()) {
      return accessToken;
    }
  }

  throw new Error("Unable to resolve GitHub access token from Nango response");
}
