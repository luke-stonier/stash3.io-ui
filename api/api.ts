import express from "express";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const app = express();
const PORT = process.env.SVC_PORT ? Number(process.env.SVC_PORT) : 0;

app.get("/buckets", async (_req, res) => {
    const s3 = new S3Client({ region: "eu-west-1" });
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    res.json(Buckets ?? []);
});

const server = app.listen(PORT, "127.0.0.1", () => {
    const actualPort = (server.address() as any).port;
    console.log("svc listening on", actualPort);
});
