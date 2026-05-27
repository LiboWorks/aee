import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';
import { IntelligenceRealtimeEvent } from './intelligence.types';

@Injectable()
export class IntelligenceRealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(IntelligenceRealtimeService.name);
  private readonly clients = new Set<WebSocket>();
  private server: WebSocketServer | null = null;
  private snapshotProvider: (() => unknown) | null = null;

  configureServer(server: WebSocketServer): void {
    this.server = server;
    this.server.on('connection', (socket) => this.handleConnection(socket));
    this.server.on('error', (error) => {
      this.logger.error(`WebSocket server error: ${error.message}`);
    });
    this.logger.log('Intelligence WebSocket server configured at /ws/intelligence');
  }

  setSnapshotProvider(provider: () => unknown): void {
    this.snapshotProvider = provider;
  }

  broadcast(event: IntelligenceRealtimeEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  onModuleDestroy(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    this.server?.close();
  }

  private handleConnection(socket: WebSocket): void {
    this.clients.add(socket);

    socket.on('close', () => {
      this.clients.delete(socket);
    });

    socket.on('error', (error) => {
      this.logger.warn(`Client socket error: ${error.message}`);
      this.clients.delete(socket);
    });

    if (this.snapshotProvider && socket.readyState === WebSocket.OPEN) {
      const snapshot = this.snapshotProvider();
      const event: IntelligenceRealtimeEvent = {
        type: 'connection.ready',
        emittedAt: new Date().toISOString(),
        payload: snapshot,
      };
      socket.send(JSON.stringify(event));
    }
  }
}
