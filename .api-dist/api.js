"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_s3_1 = require("@aws-sdk/client-s3");
const app = (0, express_1.default)();
const PORT = process.env.SVC_PORT ? Number(process.env.SVC_PORT) : 0;
app.get("/buckets", async (_req, res) => {
    const s3 = new client_s3_1.S3Client({ region: "eu-west-1" });
    const { Buckets } = await s3.send(new client_s3_1.ListBucketsCommand({}));
    res.json(Buckets ?? []);
});
const server = app.listen(PORT, "127.0.0.1", () => {
    const actualPort = server.address().port;
    console.log("svc listening on", actualPort);
});
