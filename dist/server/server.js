"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocketServer_1 = require("./WebSocketServer");
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const server = new WebSocketServer_1.WebSocketServer(PORT);
console.log('Server started');
