import type { FastifyInstance } from "fastify";
import {
  createUserCarBodySchema,
  garagePhotoUploadResponseSchema,
  patchUserCarBodySchema,
  userCarSchema,
} from "@hotwheels/shared";
import { requireUser } from "../lib/httpAuth.js";
import {
  addUserCarPhoto,
  createUserCar,
  deleteUserCar,
  deleteUserCarPhoto,
  listGarage,
  patchUserCar,
} from "../services/garage.service.js";

export async function registerGarageRoutes(app: FastifyInstance) {
  app.get("/me/garage", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const items = await listGarage(userId);
    reply.send({ items: items.map((i) => userCarSchema.parse(i)) });
  });

  app.post("/me/garage", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;

    const parsed = createUserCarBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    try {
      const created = await createUserCar(userId, parsed.data);
      reply.status(201).send(userCarSchema.parse(created));
    } catch (e) {
      if (e instanceof Error && e.message === "CAR_NOT_FOUND") {
        reply.status(404).send({ error: "Car not found" });
        return;
      }
      throw e;
    }
  });

  app.patch("/me/garage/:id", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const id = (req.params as { id: string }).id;
    const parsed = patchUserCarBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const updated = await patchUserCar(userId, id, parsed.data);
    if (!updated) {
      reply.status(404).send({ error: "Not found" });
      return;
    }
    reply.send(userCarSchema.parse(updated));
  });

  app.delete("/me/garage/:id", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const id = (req.params as { id: string }).id;
    const ok = await deleteUserCar(userId, id);
    if (!ok) {
      reply.status(404).send({ error: "Not found" });
      return;
    }
    reply.status(204).send();
  });

  const allowedPhotoMimes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

  app.post("/me/garage/:id/photos", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const garageId = (req.params as { id: string }).id;
    const file = await req.file({ limits: { fileSize: 5 * 1024 * 1024 } });
    if (!file) {
      reply.status(400).send({ error: 'Expected multipart field "photo"' });
      return;
    }
    const mime = file.mimetype.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!allowedPhotoMimes.has(mime)) {
      reply.status(400).send({ error: "Use JPEG, PNG, or WebP" });
      return;
    }
    const buffer = await file.toBuffer();
    const dto = await addUserCarPhoto(userId, garageId, buffer, mime);
    if (!dto) {
      reply.status(404).send({ error: "Not found" });
      return;
    }
    reply.status(201).send(garagePhotoUploadResponseSchema.parse({ photo: dto }));
  });

  app.delete("/me/garage/:id/photos/:photoId", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const { id, photoId } = req.params as { id: string; photoId: string };
    const ok = await deleteUserCarPhoto(userId, id, photoId);
    if (!ok) {
      reply.status(404).send({ error: "Not found" });
      return;
    }
    reply.status(204).send();
  });
}
