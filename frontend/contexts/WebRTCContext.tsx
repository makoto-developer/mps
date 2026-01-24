'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  SignalingClient,
  createSignalingClient,
  PeerManager,
  createPeerManager,
  type ConnectionState,
  type Peer,
  type WebRTCConfig,
  DEFAULT_WEBRTC_CONFIG,
} from '@/lib/webrtc';

interface WebRTCContextValue {
  connectionState: ConnectionState;
  connect: (roomId: string, userId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  broadcast: (data: ArrayBuffer) => void;
  sendToPeer: (peerId: string, data: ArrayBuffer) => boolean;
  onMessage: (handler: (peerId: string, data: ArrayBuffer) => void) => void;
  peers: Peer[];
  isConnected: boolean;
  isFallbackActive: boolean;
}

const WebRTCContext = createContext<WebRTCContextValue | null>(null);

interface WebRTCProviderProps {
  children: ReactNode;
  config?: Partial<WebRTCConfig>;
}

export function WebRTCProvider({ children, config }: WebRTCProviderProps) {
  const signalingClientRef = useRef<SignalingClient | null>(null);
  const peerManagerRef = useRef<PeerManager | null>(null);
  const messageHandlerRef = useRef<((peerId: string, data: ArrayBuffer) => void) | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    peerCount: 0,
    fallbackActive: false,
  });

  const [peers, setPeers] = useState<Peer[]>([]);

  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    setConnectionState((prev) => ({ ...prev, ...updates }));
  }, []);

  const connect = useCallback(
    async (roomId: string, userId: string): Promise<void> => {
      // Cleanup previous connections
      if (peerManagerRef.current) {
        peerManagerRef.current.cleanup();
      }
      if (signalingClientRef.current) {
        await signalingClientRef.current.disconnect();
      }

      updateConnectionState({ status: 'connecting' });

      // Create new instances
      const mergedConfig = { ...DEFAULT_WEBRTC_CONFIG, ...config };
      const signalingClient = createSignalingClient(mergedConfig);
      const peerManager = createPeerManager(signalingClient, mergedConfig);

      signalingClientRef.current = signalingClient;
      peerManagerRef.current = peerManager;

      // Setup signaling event handlers
      signalingClient.on('onPeerList', (peerList) => {
        setPeers(peerList);
        updateConnectionState({ peerCount: peerList.length });
        // Initiate connections to all existing peers
        peerManager.connectToPeers(peerList);
      });

      signalingClient.on('onPeerJoined', (peer) => {
        setPeers((prev) => [...prev, peer]);
        updateConnectionState({ peerCount: peerManagerRef.current?.getPeerCount() ?? 0 });
      });

      signalingClient.on('onPeerLeft', (peer) => {
        setPeers((prev) => prev.filter((p) => p.socketId !== peer.socketId));
        updateConnectionState({ peerCount: peerManagerRef.current?.getPeerCount() ?? 0 });
      });

      signalingClient.on('onConnect', () => {
        updateConnectionState({ status: 'connected' });
      });

      signalingClient.on('onDisconnect', () => {
        updateConnectionState({ status: 'disconnected', peerCount: 0 });
        setPeers([]);
      });

      signalingClient.on('onError', (error) => {
        console.error('Signaling error:', error);
        updateConnectionState({ status: 'failed' });
      });

      // Setup peer manager event handlers
      peerManager.on('onPeerConnected', (peerId) => {
        console.log('Peer connected:', peerId);
        updateConnectionState({ peerCount: peerManager.getPeerCount() });
      });

      peerManager.on('onPeerDisconnected', (peerId) => {
        console.log('Peer disconnected:', peerId);
        updateConnectionState({ peerCount: peerManager.getPeerCount() });
      });

      peerManager.on('onDataChannelOpen', (peerId) => {
        console.log('DataChannel open with:', peerId);
      });

      peerManager.on('onMessage', (peerId, data) => {
        messageHandlerRef.current?.(peerId, data);
      });

      peerManager.on('onConnectionFailed', (peerId, error) => {
        console.error('Connection failed with peer:', peerId, error);
        // Could trigger fallback here
      });

      // Connect to signaling server
      try {
        await signalingClient.connect(roomId, userId);
      } catch (error) {
        console.error('Failed to connect:', error);
        updateConnectionState({ status: 'failed' });
        throw error;
      }
    },
    [config, updateConnectionState]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    if (peerManagerRef.current) {
      peerManagerRef.current.cleanup();
      peerManagerRef.current = null;
    }
    if (signalingClientRef.current) {
      await signalingClientRef.current.disconnect();
      signalingClientRef.current = null;
    }
    setPeers([]);
    updateConnectionState({
      status: 'disconnected',
      peerCount: 0,
      fallbackActive: false,
    });
  }, [updateConnectionState]);

  const broadcast = useCallback((data: ArrayBuffer): void => {
    peerManagerRef.current?.broadcast(data);
  }, []);

  const sendToPeer = useCallback((peerId: string, data: ArrayBuffer): boolean => {
    return peerManagerRef.current?.sendToPeer(peerId, data) ?? false;
  }, []);

  const onMessage = useCallback(
    (handler: (peerId: string, data: ArrayBuffer) => void): void => {
      messageHandlerRef.current = handler;
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerManagerRef.current?.cleanup();
      signalingClientRef.current?.disconnect();
    };
  }, []);

  const value: WebRTCContextValue = {
    connectionState,
    connect,
    disconnect,
    broadcast,
    sendToPeer,
    onMessage,
    peers,
    isConnected: connectionState.status === 'connected',
    isFallbackActive: connectionState.fallbackActive,
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTCContext(): WebRTCContextValue {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTCContext must be used within a WebRTCProvider');
  }
  return context;
}
