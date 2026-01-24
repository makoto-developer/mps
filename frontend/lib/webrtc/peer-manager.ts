/**
 * WebRTC Peer Manager
 *
 * Manages RTCPeerConnection instances for P2P communication.
 * Handles SDP offer/answer exchange and ICE candidate gathering.
 */

import { SignalingClient } from './signaling-client';
import { DataChannelWrapper, DEFAULT_CHANNEL_CONFIG } from './data-channel';
import type { Peer, ICEServerConfig, WebRTCConfig, DEFAULT_WEBRTC_CONFIG } from './types';

const DRAWING_CHANNEL_LABEL = 'drawing';

export interface PeerConnection {
  peerId: string;
  userId: string;
  connection: RTCPeerConnection;
  dataChannel: DataChannelWrapper;
  state: RTCPeerConnectionState;
}

type PeerEventHandler = {
  onPeerConnected: (peerId: string) => void;
  onPeerDisconnected: (peerId: string) => void;
  onDataChannelOpen: (peerId: string) => void;
  onDataChannelClose: (peerId: string) => void;
  onMessage: (peerId: string, data: ArrayBuffer) => void;
  onConnectionFailed: (peerId: string, error: Error) => void;
};

export class PeerManager {
  private peers: Map<string, PeerConnection> = new Map();
  private signalingClient: SignalingClient;
  private config: WebRTCConfig;
  private handlers: Partial<PeerEventHandler> = {};
  private iceServers: ICEServerConfig[] = [];
  private localSocketId: string | null = null;

  constructor(signalingClient: SignalingClient, config?: Partial<WebRTCConfig>) {
    this.signalingClient = signalingClient;
    this.config = { ...DEFAULT_WEBRTC_CONFIG, ...config };
    this.initializeICEServers();
    this.setupSignalingHandlers();
  }

  /**
   * Initialize connections with all existing peers in the room
   */
  async connectToPeers(peers: Peer[]): Promise<void> {
    for (const peer of peers) {
      await this.createOffer(peer);
    }
  }

  /**
   * Send data to all connected peers
   */
  broadcast(data: ArrayBuffer): void {
    for (const peer of this.peers.values()) {
      peer.dataChannel.send(data);
    }
  }

  /**
   * Send data to a specific peer
   */
  sendToPeer(peerId: string, data: ArrayBuffer): boolean {
    const peer = this.peers.get(peerId);
    if (!peer) return false;
    return peer.dataChannel.send(data);
  }

  /**
   * Get all connected peer IDs
   */
  getConnectedPeerIds(): string[] {
    return Array.from(this.peers.entries())
      .filter(([_, peer]) => peer.dataChannel.isReady())
      .map(([id]) => id);
  }

  /**
   * Get total peer count
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Register event handlers
   */
  on<K extends keyof PeerEventHandler>(
    event: K,
    handler: PeerEventHandler[K]
  ): void {
    this.handlers[event] = handler;
  }

  /**
   * Cleanup all peer connections
   */
  cleanup(): void {
    for (const [peerId, peer] of this.peers) {
      peer.dataChannel.close();
      peer.connection.close();
    }
    this.peers.clear();
  }

  /**
   * Set local socket ID (for filtering messages)
   */
  setLocalSocketId(socketId: string): void {
    this.localSocketId = socketId;
  }

  // Private methods

  private initializeICEServers(): void {
    // Always include Google STUN servers
    this.iceServers.push({
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
      ],
    });

    // Add TURN server if configured
    if (this.config.turnUrl) {
      this.iceServers.push({
        urls: this.config.turnUrl,
        username: this.config.turnUsername,
        credential: this.config.turnCredential,
      });
    }
  }

  private setupSignalingHandlers(): void {
    this.signalingClient.on('onPeerJoined', (peer) => {
      // New peer joined - they will send us an offer
      console.log('Peer joined:', peer.socketId);
    });

    this.signalingClient.on('onPeerLeft', (peer) => {
      this.removePeer(peer.socketId);
    });

    this.signalingClient.on('onOffer', async (message) => {
      await this.handleOffer(message.fromSocketId, message.fromUserId, message.sdp);
    });

    this.signalingClient.on('onAnswer', async (message) => {
      await this.handleAnswer(message.fromSocketId, message.sdp);
    });

    this.signalingClient.on('onIceCandidate', async (message) => {
      await this.handleIceCandidate(message.fromSocketId, message.candidate);
    });
  }

  private async createOffer(peer: Peer): Promise<void> {
    const peerConnection = this.createPeerConnection(peer.socketId, peer.userId, true);

    try {
      const offer = await peerConnection.connection.createOffer();
      await peerConnection.connection.setLocalDescription(offer);

      this.signalingClient.sendOffer(peer.socketId, offer);
    } catch (error) {
      console.error('Failed to create offer:', error);
      this.handlers.onConnectionFailed?.(peer.socketId, error as Error);
    }
  }

  private async handleOffer(
    fromSocketId: string,
    fromUserId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    const peerConnection = this.createPeerConnection(fromSocketId, fromUserId, false);

    try {
      await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peerConnection.connection.createAnswer();
      await peerConnection.connection.setLocalDescription(answer);

      this.signalingClient.sendAnswer(fromSocketId, answer);
    } catch (error) {
      console.error('Failed to handle offer:', error);
      this.handlers.onConnectionFailed?.(fromSocketId, error as Error);
    }
  }

  private async handleAnswer(
    fromSocketId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    const peer = this.peers.get(fromSocketId);
    if (!peer) {
      console.warn('Received answer from unknown peer:', fromSocketId);
      return;
    }

    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (error) {
      console.error('Failed to handle answer:', error);
      this.handlers.onConnectionFailed?.(fromSocketId, error as Error);
    }
  }

  private async handleIceCandidate(
    fromSocketId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peer = this.peers.get(fromSocketId);
    if (!peer) {
      console.warn('Received ICE candidate from unknown peer:', fromSocketId);
      return;
    }

    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  private createPeerConnection(
    peerId: string,
    userId: string,
    isInitiator: boolean
  ): PeerConnection {
    // Remove existing connection if any
    if (this.peers.has(peerId)) {
      this.removePeer(peerId);
    }

    const connection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    const dataChannel = new DataChannelWrapper();

    if (isInitiator) {
      // Create data channel as initiator
      const channel = connection.createDataChannel(
        DRAWING_CHANNEL_LABEL,
        DEFAULT_CHANNEL_CONFIG
      );
      dataChannel.setChannel(channel);
    } else {
      // Wait for data channel from initiator
      connection.ondatachannel = (event) => {
        if (event.channel.label === DRAWING_CHANNEL_LABEL) {
          dataChannel.setChannel(event.channel);
        }
      };
    }

    // Setup connection event handlers
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingClient.sendIceCandidate(peerId, event.candidate.toJSON());
      }
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.state = state;
      }

      switch (state) {
        case 'connected':
          this.handlers.onPeerConnected?.(peerId);
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          this.handlers.onPeerDisconnected?.(peerId);
          if (state === 'failed') {
            this.handlers.onConnectionFailed?.(peerId, new Error('Connection failed'));
          }
          break;
      }
    };

    // Setup data channel event handlers
    dataChannel.onStateChange((state) => {
      if (state === 'open') {
        this.handlers.onDataChannelOpen?.(peerId);
      } else if (state === 'closed') {
        this.handlers.onDataChannelClose?.(peerId);
      }
    });

    dataChannel.onMessage((data) => {
      this.handlers.onMessage?.(peerId, data);
    });

    const peerConnection: PeerConnection = {
      peerId,
      userId,
      connection,
      dataChannel,
      state: 'new',
    };

    this.peers.set(peerId, peerConnection);

    return peerConnection;
  }

  private removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    peer.dataChannel.close();
    peer.connection.close();
    this.peers.delete(peerId);

    this.handlers.onPeerDisconnected?.(peerId);
  }
}

export function createPeerManager(
  signalingClient: SignalingClient,
  config?: Partial<WebRTCConfig>
): PeerManager {
  return new PeerManager(signalingClient, config);
}
