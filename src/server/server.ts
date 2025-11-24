import { WebSocketServer } from './WebSocketServer';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const server = new WebSocketServer(PORT);
console.log('Server started');