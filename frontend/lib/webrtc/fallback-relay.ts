/**
 * Fallback Relay for P2P Connection Failures
 *
 * Automatically switches between WebRTC P2P and Socket.IO
 * when connections fail or cannot be established.
 */

import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import {
  encodeStrokeMessage,
  decodeStrokeMessage,
  StrokeMessageType,
  type StrokeMessage,
  type StrokeCompleteMessage,
} from './stroke-codec';
import type { Stroke } from '@/types';

export type FallbackMode = 'p2p' | 'relay' | 'hybrid';

export interface FallbackConfig {
  connectionTimeout: number;
  maxRetries: number;
  healthCheckInterval: number;
}

const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  connectionTimeout: 10000,
  maxRetries: 3,
  healthCheckInterval: 30000,
};

type FallbackEventHandler = {
  onModeChange: (mode: FallbackMode) => void;
  onStrokeReceived: (stroke: Stroke) => void;
  onError: (error: Error) => void;
};

export class FallbackRelay {
  private config: FallbackConfig;
  private currentMode: FallbackMode = 'p2p';
  private handlers: Partial<FallbackEventHandler> = {};
  private roomId: string | null = null;
  private retryCount = 0;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isSocketConnected = false;

  constructor(config?: Partial<FallbackConfig>) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };
  }

  /**
   * Initialize fallback relay for a room
   */
  initialize(roomId: string): void {
    this.roomId = roomId;
    this.setupSocketListeners();
  }

  /**
   * Switch to relay mode (Socket.IO)
   */
  switchToRelay(): void {
    if (this.currentMode === 'relay') return;

    console.log('Switching to relay mode');
    this.currentMode = 'relay';
    this.connectSocket();
    this.handlers.onModeChange?.('relay');
  }

  /**
   * Switch to P2P mode
   */
  switchToP2P(): void {
    if (this.currentMode === 'p2p') return;

    console.log('Switching to P2P mode');
    this.currentMode = 'p2p';
    this.retryCount = 0;
    this.handlers.onModeChange?.('p2p');
  }

  /**
   * Switch to hybrid mode (both P2P and relay active)
   */
  switchToHybrid(): void {
    if (this.currentMode === 'hybrid') return;

    console.log('Switching to hybrid mode');
    this.currentMode = 'hybrid';
    this.connectSocket();
    this.handlers.onModeChange?.('hybrid');
  }

  /**
   * Handle P2P connection failure
   */
  handleP2PFailure(): void {
    this.retryCount++;

    if (this.retryCount >= this.config.maxRetries) {
      console.log(`P2P failed after ${this.retryCount} retries, switching to relay`);
      this.switchToRelay();
    } else {
      console.log(`P2P failed, retry ${this.retryCount}/${this.config.maxRetries}`);
    }
  }

  /**
   * Handle P2P connection success
   */
  handleP2PSuccess(): void {
    this.retryCount = 0;

    if (this.currentMode === 'relay') {
      console.log('P2P recovered, switching back');
      this.switchToP2P();
    }
  }

  /**
   * Send stroke via relay (Socket.IO)
   */
  sendViaRelay(stroke: Stroke): void {
    if (this.currentMode === 'p2p') return;

    const socket = getSocket();
    if (socket.connected && this.roomId) {
      socket.emit('draw-stroke', {
        roomId: this.roomId,
        stroke,
      });
    }
  }

  /**
   * Get current fallback mode
   */
  getMode(): FallbackMode {
    return this.currentMode;
  }

  /**
   * Check if relay is active
   */
  isRelayActive(): boolean {
    return this.currentMode === 'relay' || this.currentMode === 'hybrid';
  }

  /**
   * Register event handlers
   */
  on<K extends keyof FallbackEventHandler>(
    event: K,
    handler: FallbackEventHandler[K]
  ): void {
    this.handlers[event] = handler;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.disconnectSocket();
    this.currentMode = 'p2p';
    this.roomId = null;
    this.retryCount = 0;
  }

  // Private methods

  private connectSocket(): void {
    if (this.isSocketConnected) return;

    const socket = connectSocket();
    this.isSocketConnected = true;

    if (this.roomId) {
      socket.emit('join-room', this.roomId);
    }

    this.startHealthCheck();
  }

  private disconnectSocket(): void {
    if (!this.isSocketConnected) return;

    const socket = getSocket();
    if (this.roomId) {
      socket.emit('leave-room', this.roomId);
    }

    this.isSocketConnected = false;
  }

  private setupSocketListeners(): void {
    const socket = getSocket();

    socket.on('stroke-drawn', (stroke: Stroke) => {
      if (this.isRelayActive()) {
        this.handlers.onStrokeReceived?.(stroke);
      }
    });

    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      this.handlers.onError?.(error);
    });

    socket.on('disconnect', () => {
      this.isSocketConnected = false;
    });
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(() => {
      const socket = getSocket();
      if (!socket.connected && this.isRelayActive()) {
        console.log('Socket disconnected, attempting reconnect');
        this.connectSocket();
      }
    }, this.config.healthCheckInterval);
  }
}

export function createFallbackRelay(config?: Partial<FallbackConfig>): FallbackRelay {
  return new FallbackRelay(config);
}
