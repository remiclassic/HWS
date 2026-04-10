import type { FastifyInstance } from "fastify";
import { carsListResponseSchema, carsQuerySchema, carDetailSchema } from "@hotwheels/shared";
import { getCarById, getThExplanation, listCars } from "../services/cars.service.js";

export async function registerCarRoutes(app: FastifyInstance) {
  app.get("/cars", async (req, reply) => {
    const parsed = carsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const result = await listCars(parsed.data);
    const body = carsListResponseSchema.parse(result);
    reply.send(body);
  });

  app.get("/cars/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const car = await getCarById(id);
    if (!car) {
      reply.status(404).send({ error: "Not found" });
      return;
    }
    const body = carDetailSchema.parse(car);
    reply.send(body);
  });

  app.get("/cars/:id/th-explanation", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const data = await getThExplanation(id);
    if (!data) {
      reply.status(404).send({ error: "Not found" });
      return;
    }
    reply.send(data);
  });
}
