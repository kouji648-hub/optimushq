import type { WsClientMessage, WsServerMessage } from '../../../shared/types';
import { getImpersonateUserId } from './http';

type MessageHandler = (msg: WsServerMessage) => void;

class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMessages: WsClientMessage[] = [];

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return; // Don't connect without auth

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    const impersonateId = getImpersonateUserId();
    if (impersonateId) {
      wsUrl += `&impersonate=${encodeURIComponent(impersonateId)}`;
    }
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Flush any messages queued while connecting
      for (const msg of this.pendingMessages) {
        this.ws!.send(JSON.stringify(msg));
      }
      this.pendingMessages = [];
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        this.handlers.forEach((h) => h(msg));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = (event) => {
      // Don't reconnect if closed due to auth failure
      if (event.code === 4001) {
        console.log('WebSocket auth failed');
        return;
      }
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Force reconnect with new token (call after login/logout) */
  reconnect() {
    this.disconnect();
    this.connect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  send(msg: WsClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      // Queue for delivery once connected
      this.pendingMessages.push(msg);
    }
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

export const wsClient = new WsClient();
