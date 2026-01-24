/**
 * Phoenix Channel Signaling Client for WebRTC
 *
 * Handles WebSocket communication with the Phoenix signaling server
 * for peer discovery and SDP/ICE exchange.
 */

import type {
  Peer,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  PeerJoinedMessage,
  PeerLeftMessage,
  PeerListMessage,
  WebRTCConfig,
  DEFAULT_WEBRTC_CONFIG,
} from './types';

type SignalingEventHandler = {
  onPeerList: (peers: Peer[]) => void;
  onPeerJoined: (peer: Peer) => void;
  onPeerLeft: (peer: Peer) => void;
  onOffer: (message: OfferMessage) => void;
  onAnswer: (message: AnswerMessage) => void;
  onIceCandidate: (message: IceCandidateMessage) => void;
  onError: (error: Error) => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

interface PhoenixSocket {
  connect: () => void;
  disconnect: () => void;
  channel: (topic: string, params?: Record<string, unknown>) => PhoenixChannel;
  onOpen: (callback: () => void) => void;
  onClose: (callback: () => void) => void;
  onError: (callback: (error: unknown) => void) => void;
}

interface PhoenixChannel {
  join: () => PhoenixPush;
  leave: () => PhoenixPush;
  push: (event: string, payload: Record<string, unknown>) => PhoenixPush;
  on: (event: string, callback: (payload: unknown) => void) => void;
  off: (event: string) => void;
}

interface PhoenixPush {
  receive: (status: string, callback: (response: unknown) => void) => PhoenixPush;
}

export class SignalingClient {
  private socket: PhoenixSocket | null = null;
  private channel: PhoenixChannel | null = null;
  private config: WebRTCConfig;
  private handlers: Partial<SignalingEventHandler> = {};
  private roomId: string | null = null;
  private userId: string | null = null;
  private socketId: string | null = null;
  private connected = false;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = { ...DEFAULT_WEBRTC_CONFIG, ...config };
  }

  /**
   * Connect to signaling server and join a room
   */
  async connect(roomId: string, userId: string): Promise<void> {
    if (this.connected) {
      await this.disconnect();
    }

    this.roomId = roomId;
    this.userId = userId;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      this.initializeSocket()
        .then(() => this.joinRoom())
        .then(() => {
          clearTimeout(timeoutId);
          this.connected = true;
          this.handlers.onConnect?.();
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Disconnect from signaling server
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    this.roomId = null;
    this.handlers.onDisconnect?.();
  }

  /**
   * Send SDP offer to a specific peer
   */
  sendOffer(targetSocketId: string, sdp: RTCSessionDescriptionInit): void {
    this.channel?.push('offer', {
      target_socket_id: targetSocketId,
      sdp,
    });
  }

  /**
   * Send SDP answer to a specific peer
   */
  sendAnswer(targetSocketId: string, sdp: RTCSessionDescriptionInit): void {
    this.channel?.push('answer', {
      target_socket_id: targetSocketId,
      sdp,
    });
  }

  /**
   * Send ICE candidate to a specific peer
   */
  sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit): void {
    this.channel?.push('ice-candidate', {
      target_socket_id: targetSocketId,
      candidate,
    });
  }

  /**
   * Register event handlers
   */
  on<K extends keyof SignalingEventHandler>(
    event: K,
    handler: SignalingEventHandler[K]
  ): void {
    this.handlers[event] = handler;
  }

  /**
   * Get current socket ID
   */
  getSocketId(): string | null {
    return this.socketId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // Private methods

  private async initializeSocket(): Promise<void> {
    // Dynamic import to handle SSR
    const { Socket } = await import('phoenix');

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.config.phoenixUrl}/socket`;

      this.socket = new Socket(wsUrl, {
        params: { user_id: this.userId },
      }) as PhoenixSocket;

      this.socket.onOpen(() => {
        resolve();
      });

      this.socket.onError((error) => {
        this.handlers.onError?.(new Error(`Socket error: ${error}`));
        reject(new Error(`Socket connection failed: ${error}`));
      });

      this.socket.onClose(() => {
        this.connected = false;
        this.handlers.onDisconnect?.();
      });

      this.socket.connect();
    });
  }

  private async joinRoom(): Promise<void> {
    if (!this.socket || !this.roomId) {
      throw new Error('Socket not initialized or room not specified');
    }

    return new Promise((resolve, reject) => {
      this.channel = this.socket!.channel(`room:${this.roomId}`, {});

      this.setupChannelHandlers();

      this.channel
        .join()
        .receive('ok', () => {
          resolve();
        })
        .receive('error', (response: unknown) => {
          reject(new Error(`Failed to join room: ${JSON.stringify(response)}`));
        });
    });
  }

  private setupChannelHandlers(): void {
    if (!this.channel) return;

    this.channel.on('peer-list', (payload: unknown) => {
      const data = payload as { peers: Array<{ user_id: string; socket_id: string }> };
      const peers: Peer[] = data.peers.map((p) => ({
        userId: p.user_id,
        socketId: p.socket_id,
      }));
      this.handlers.onPeerList?.(peers);
    });

    this.channel.on('peer-joined', (payload: unknown) => {
      const data = payload as { user_id: string; socket_id: string };
      this.handlers.onPeerJoined?.({
        userId: data.user_id,
        socketId: data.socket_id,
      });
    });

    this.channel.on('peer-left', (payload: unknown) => {
      const data = payload as { user_id: string; socket_id: string };
      this.handlers.onPeerLeft?.({
        userId: data.user_id,
        socketId: data.socket_id,
      });
    });

    this.channel.on('offer', (payload: unknown) => {
      const data = payload as {
        from_socket_id: string;
        from_user_id: string;
        target_socket_id: string;
        sdp: RTCSessionDescriptionInit;
      };

      // Only process offers meant for us
      if (this.socketId && data.target_socket_id !== this.socketId) return;

      this.handlers.onOffer?.({
        type: 'offer',
        fromSocketId: data.from_socket_id,
        fromUserId: data.from_user_id,
        targetSocketId: data.target_socket_id,
        sdp: data.sdp,
      });
    });

    this.channel.on('answer', (payload: unknown) => {
      const data = payload as {
        from_socket_id: string;
        from_user_id: string;
        target_socket_id: string;
        sdp: RTCSessionDescriptionInit;
      };

      if (this.socketId && data.target_socket_id !== this.socketId) return;

      this.handlers.onAnswer?.({
        type: 'answer',
        fromSocketId: data.from_socket_id,
        fromUserId: data.from_user_id,
        targetSocketId: data.target_socket_id,
        sdp: data.sdp,
      });
    });

    this.channel.on('ice-candidate', (payload: unknown) => {
      const data = payload as {
        from_socket_id: string;
        target_socket_id: string;
        candidate: RTCIceCandidateInit;
      };

      if (this.socketId && data.target_socket_id !== this.socketId) return;

      this.handlers.onIceCandidate?.({
        type: 'ice-candidate',
        fromSocketId: data.from_socket_id,
        targetSocketId: data.target_socket_id,
        candidate: data.candidate,
      });
    });
  }
}

export function createSignalingClient(config?: Partial<WebRTCConfig>): SignalingClient {
  return new SignalingClient(config);
}
