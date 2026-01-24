/**
 * WebRTC Types for P2P Drawing Application
 */

export interface Peer {
  userId: string;
  socketId: string;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'peer-joined' | 'peer-left' | 'peer-list';
}

export interface OfferMessage extends SignalingMessage {
  type: 'offer';
  fromSocketId: string;
  fromUserId: string;
  targetSocketId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerMessage extends SignalingMessage {
  type: 'answer';
  fromSocketId: string;
  fromUserId: string;
  targetSocketId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage extends SignalingMessage {
  type: 'ice-candidate';
  fromSocketId: string;
  targetSocketId: string;
  candidate: RTCIceCandidateInit;
}

export interface PeerJoinedMessage extends SignalingMessage {
  type: 'peer-joined';
  userId: string;
  socketId: string;
}

export interface PeerLeftMessage extends SignalingMessage {
  type: 'peer-left';
  userId: string;
  socketId: string;
}

export interface PeerListMessage extends SignalingMessage {
  type: 'peer-list';
  peers: Peer[];
}

export type SignalingEvent =
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | PeerListMessage;

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
  peerCount: number;
  fallbackActive: boolean;
}

export interface ICEServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRTCConfig {
  phoenixUrl: string;
  turnUrl?: string;
  turnUsername?: string;
  turnCredential?: string;
  connectionTimeout: number;
  maxRetries: number;
}

export const DEFAULT_WEBRTC_CONFIG: WebRTCConfig = {
  phoenixUrl: process.env.NEXT_PUBLIC_PHOENIX_URL || 'ws://localhost:22303',
  turnUrl: process.env.NEXT_PUBLIC_TURN_URL || 'turn:localhost:22304',
  turnUsername: process.env.NEXT_PUBLIC_TURN_USERNAME,
  turnCredential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  connectionTimeout: 10000,
  maxRetries: 3,
};
