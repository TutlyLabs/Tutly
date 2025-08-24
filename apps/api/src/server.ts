import type { Express } from "express";
import { json, urlencoded } from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(urlencoded({ extended: true }))
    .use(json())
    .use(cors())
    .get("/message/:name", (req, res) => {
      return res.json({ message: `hello ${req.params.name}` });
    })
    .get("/status", (_, res) => {
      return res.json({ ok: true });
    });

  return app;
};
