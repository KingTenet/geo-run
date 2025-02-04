import express, { Express, Request, Response, Application } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { setupWebSocket } from "./websocket";

dotenv.config();

const app: Application = express();
const server = createServer(app);
const port = process.env.PORT || 8000;

app.use(express.static("public"));

app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to Express & TypeScript Server");
});

app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
});

setupWebSocket(server);

server.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
