import { SERVER_PORT } from '../shared/config/constants';
import { WebSocketServer } from './WebSocketServer';
import { RoomManager } from './RoomManager';

const roomManager = new RoomManager();
const wsServer = new WebSocketServer(SERVER_PORT, roomManager);
roomManager.setWsServer(wsServer);

console.log('Server started');