import "dotenv/config";
import { createApp } from "./createApp.js";

const port = Number(process.env["PORT"] ?? 3001);

const start = async () => {
  const app = await createApp();
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

await start();
