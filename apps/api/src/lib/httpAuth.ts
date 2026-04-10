import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyUserToken } from "./auth.js";

export async function requireUser(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<string | undefined> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Unauthorized" });
    return undefined;
  }
  const token = auth.slice("Bearer ".length).trim();
  try {
    const userId = await verifyUserToken(token);
    req.log.debug({ reqId: req.id, userId }, "authenticated");
    return userId;
  } catch {
    reply.status(401).send({ error: "Invalid token" });
    return undefined;
  }
}
