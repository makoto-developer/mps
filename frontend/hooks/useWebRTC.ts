'use client';

import { useEffect, useCallback, useState } from 'react';
import { useWebRTCContext } from '@/contexts/WebRTCContext';

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  autoConnect?: boolean;
}

interface UseWebRTCReturn {
  isConnected: boolean;
  peerCount: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed';
  isFallbackActive: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  broadcast: (data: ArrayBuffer) => void;
  onMessage: (handler: (peerId: string, data: ArrayBuffer) => void) => void;
}

export function useWebRTC({
  roomId,
  userId,
  autoConnect = true,
}: UseWebRTCOptions): UseWebRTCReturn {
  const {
    connectionState,
    connect: contextConnect,
    disconnect: contextDisconnect,
    broadcast,
    onMessage,
    isConnected,
    isFallbackActive,
  } = useWebRTCContext();

  const [hasConnected, setHasConnected] = useState(false);

  const connect = useCallback(async () => {
    if (roomId && userId) {
      await contextConnect(roomId, userId);
      setHasConnected(true);
    }
  }, [roomId, userId, contextConnect]);

  const disconnect = useCallback(async () => {
    await contextDisconnect();
    setHasConnected(false);
  }, [contextDisconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && roomId && userId && !hasConnected) {
      connect().catch(console.error);
    }

    return () => {
      if (hasConnected) {
        disconnect();
      }
    };
  }, [autoConnect, roomId, userId, hasConnected, connect, disconnect]);

  return {
    isConnected,
    peerCount: connectionState.peerCount,
    connectionStatus: connectionState.status,
    isFallbackActive,
    connect,
    disconnect,
    broadcast,
    onMessage,
  };
}
