import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import { IncomingMessage } from 'http';

export interface WebSocketServerOptions {
    port?: number;
    server?: Server;
    path?: string;
    maxClients?: number;
    heartbeatInterval?: number;
}

export interface ScreenshotMessage {
    type: 'screenshot';
    data: Buffer;
    trigger: string;
    timestamp: number;
    pageId?: string;
}

export interface StatusMessage {
    type: 'status';
    message: string;
    timestamp: number;
    pageId?: string;
}

export type WebSocketMessage = ScreenshotMessage | StatusMessage;

export class ScreenshotWebSocketServer extends EventEmitter {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();
    private options: Required<Omit<WebSocketServerOptions, 'server'>> & { server?: Server };
    private heartbeatTimer: NodeJS.Timeout | null = null;

    constructor(options: WebSocketServerOptions = {}) {
        super();
        this.options = {
            port: options.port ?? 8080,
            server: options.server,
            path: options.path ?? '/screenshots',
            maxClients: options.maxClients ?? 50,
            heartbeatInterval: options.heartbeatInterval ?? 30000,
        };
    }

    async start(): Promise<void> {
        const wsOptions: {
            path: string;
            maxPayload: number;
            server?: Server;
            port?: number;
        } = {
            path: this.options.path,
            maxPayload: 10 * 1024 * 1024, // 10MB max payload
        };

        if (this.options.server) {
            wsOptions.server = this.options.server;
        } else {
            wsOptions.port = this.options.port;
        }

        this.wss = new WebSocketServer(wsOptions);

        this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
            this.handleConnection(ws, request);
        });

        this.wss.on('error', (error) => {
            console.error('WebSocket server error:', error);
            this.emit('error', error);
        });

        // Start heartbeat
        this.startHeartbeat();

        console.log(`Screenshot WebSocket server started on ${this.options.server ? 'HTTP server' : `port ${this.options.port}`}${this.options.path}`);
        this.emit('started');
    }

    private handleConnection(ws: WebSocket, request: IncomingMessage): void {
        // Check client limit
        if (this.clients.size >= this.options.maxClients) {
            console.warn('Max clients reached, rejecting connection');
            ws.close(1013, 'Server overloaded');
            return;
        }

        const clientIp = request.socket.remoteAddress || 'unknown';
        console.log(`New WebSocket client connected from ${clientIp}`);

        // Add client to set
        this.clients.add(ws);

        // Set up client connection
        ws.isAlive = true;
        
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(ws, message);
            } catch (error) {
                console.warn('Invalid message from client:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format',
                    timestamp: Date.now(),
                }));
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`Client disconnected: ${code} ${reason}`);
            this.clients.delete(ws);
            this.emit('clientDisconnected', { clientIp, code, reason });
        });

        ws.on('error', (error) => {
            console.error('Client WebSocket error:', error);
            this.clients.delete(ws);
        });

        // Send welcome message
        this.sendToClient(ws, {
            type: 'status',
            message: 'Connected to screenshot stream',
            timestamp: Date.now(),
        });

        this.emit('clientConnected', { clientIp });
    }

    private handleMessage(ws: WebSocket, message: { type: string; pageId?: string }): void {
        switch (message.type) {
            case 'ping':
                this.sendToClient(ws, {
                    type: 'status',
                    message: 'pong',
                    timestamp: Date.now(),
                });
                break;
            
            case 'subscribe':
                // Handle subscription to specific page
                if (message.pageId) {
                    ws.pageId = message.pageId;
                    this.sendToClient(ws, {
                        type: 'status',
                        message: `Subscribed to page ${message.pageId}`,
                        timestamp: Date.now(),
                        pageId: message.pageId,
                    });
                }
                break;
            
            default:
                this.sendToClient(ws, {
                    type: 'status',
                    message: 'Unknown message type',
                    timestamp: Date.now(),
                });
        }
    }

    private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            if (message.type === 'screenshot') {
                // Send binary data directly for screenshots
                ws.send(message.data);
            } else {
                // Send JSON for status messages
                ws.send(JSON.stringify(message));
            }
        }
    }

    broadcast(message: WebSocketMessage): void {
        const targetClients = message.pageId 
            ? Array.from(this.clients).filter(client => client.pageId === message.pageId || !client.pageId)
            : Array.from(this.clients);

        targetClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                this.sendToClient(client, message);
            }
        });
    }

    broadcastScreenshot(data: Buffer, trigger: string, pageId?: string): void {
        this.broadcast({
            type: 'screenshot',
            data,
            trigger,
            timestamp: Date.now(),
            pageId,
        });
    }

    broadcastStatus(message: string, pageId?: string): void {
        this.broadcast({
            type: 'status',
            message,
            timestamp: Date.now(),
            pageId,
        });
    }

    private startHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.heartbeatTimer = setInterval(() => {
            this.clients.forEach(ws => {
                if (!ws.isAlive) {
                    console.log('Removing dead client');
                    this.clients.delete(ws);
                    ws.terminate();
                    return;
                }

                ws.isAlive = false;
                ws.ping();
            });
        }, this.options.heartbeatInterval);
    }

    getConnectedClientsCount(): number {
        return this.clients.size;
    }

    getServerInfo(): object {
        return {
            port: this.options.port,
            path: this.options.path,
            connectedClients: this.clients.size,
            maxClients: this.options.maxClients,
            isRunning: this.wss !== null,
        };
    }

    async stop(): Promise<void> {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // Close all client connections
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close(1001, 'Server shutting down');
            }
        });
        this.clients.clear();

        // Close the server
        if (this.wss) {
            await new Promise<void>((resolve, reject) => {
                this.wss!.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            this.wss = null;
        }

        console.log('Screenshot WebSocket server stopped');
        this.emit('stopped');
    }

    isRunning(): boolean {
        return this.wss !== null;
    }
}

// Extend WebSocket interface to include custom properties
declare module 'ws' {
    interface WebSocket {
        isAlive?: boolean;
        pageId?: string;
    }
}

export default ScreenshotWebSocketServer;