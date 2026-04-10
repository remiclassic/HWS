import * as jose from "jose";

const getSecret = () => {
  const s =
    process.env["JWT_SECRET"] ??
    (process.env["NODE_ENV"] === "production" ? undefined : "dev-insecure-secret-min-16");
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET must be set (min 16 chars)");
  }
  return new TextEncoder().encode(s);
};

export async function signUserToken(userId: string): Promise<string> {
  return new jose.SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyUserToken(token: string): Promise<string> {
  const { payload } = await jose.jwtVerify(token, getSecret());
  const sub = payload["sub"];
  if (typeof sub !== "string") throw new Error("Invalid token");
  return sub;
}
