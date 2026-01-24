'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useWebRTCContext } from '@/contexts/WebRTCContext';
import {
  encodeStrokeMessage,
  decodeStrokeMessage,
  StrokeMessageType,
  StrokeTool,
  toolNameToEnum,
  enumToToolName,
  hexToPackedColor,
  packedColorToHex,
  type StrokeMessage,
  type StrokeStartMessage,
  type StrokePointMessage,
  type StrokeEndMessage,
  type StrokeCompleteMessage,
} from '@/lib/webrtc/stroke-codec';
import type { Point, Stroke } from '@/types';

interface UseP2PDrawingOptions {
  onRemoteStrokeStart?: (strokeId: number, tool: string, color: string, width: number) => void;
  onRemoteStrokePoint?: (strokeId: number, x: number, y: number) => void;
  onRemoteStrokeEnd?: (strokeId: number) => void;
  onRemoteStrokeComplete?: (stroke: Stroke) => void;
}

interface UseP2PDrawingReturn {
  sendStrokeStart: (strokeId: number, tool: string, color: string, width: number) => void;
  sendStrokePoint: (strokeId: number, x: number, y: number) => void;
  sendStrokeEnd: (strokeId: number) => void;
  sendStrokeComplete: (
    strokeId: number,
    tool: string,
    color: string,
    width: number,
    points: Point[]
  ) => void;
  isP2PEnabled: boolean;
}

export function useP2PDrawing(options: UseP2PDrawingOptions = {}): UseP2PDrawingReturn {
  const { broadcast, onMessage, isConnected, connectionState } = useWebRTCContext();
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Handle incoming messages
  useEffect(() => {
    onMessage((peerId, data) => {
      const message = decodeStrokeMessage(data);
      if (!message) return;

      switch (message.type) {
        case StrokeMessageType.STROKE_START: {
          const m = message as StrokeStartMessage;
          optionsRef.current.onRemoteStrokeStart?.(
            m.strokeId,
            enumToToolName(m.tool),
            packedColorToHex(m.color),
            m.width
          );
          break;
        }
        case StrokeMessageType.STROKE_POINT: {
          const m = message as StrokePointMessage;
          optionsRef.current.onRemoteStrokePoint?.(m.strokeId, m.x, m.y);
          break;
        }
        case StrokeMessageType.STROKE_END: {
          const m = message as StrokeEndMessage;
          optionsRef.current.onRemoteStrokeEnd?.(m.strokeId);
          break;
        }
        case StrokeMessageType.STROKE_COMPLETE: {
          const m = message as StrokeCompleteMessage;
          const stroke: Stroke = {
            id: String(m.strokeId),
            tool: enumToToolName(m.tool) as Stroke['tool'],
            color: packedColorToHex(m.color),
            width: m.width,
            points: m.points,
            user: { id: 'remote', nickname: 'Remote' },
          };
          optionsRef.current.onRemoteStrokeComplete?.(stroke);
          break;
        }
      }
    });
  }, [onMessage]);

  const sendStrokeStart = useCallback(
    (strokeId: number, tool: string, color: string, width: number) => {
      if (!isConnected || connectionState.peerCount === 0) return;

      const message: StrokeStartMessage = {
        type: StrokeMessageType.STROKE_START,
        strokeId,
        tool: toolNameToEnum(tool),
        color: hexToPackedColor(color),
        width,
      };

      broadcast(encodeStrokeMessage(message));
    },
    [broadcast, isConnected, connectionState.peerCount]
  );

  const sendStrokePoint = useCallback(
    (strokeId: number, x: number, y: number) => {
      if (!isConnected || connectionState.peerCount === 0) return;

      const message: StrokePointMessage = {
        type: StrokeMessageType.STROKE_POINT,
        strokeId,
        x,
        y,
      };

      broadcast(encodeStrokeMessage(message));
    },
    [broadcast, isConnected, connectionState.peerCount]
  );

  const sendStrokeEnd = useCallback(
    (strokeId: number) => {
      if (!isConnected || connectionState.peerCount === 0) return;

      const message: StrokeEndMessage = {
        type: StrokeMessageType.STROKE_END,
        strokeId,
      };

      broadcast(encodeStrokeMessage(message));
    },
    [broadcast, isConnected, connectionState.peerCount]
  );

  const sendStrokeComplete = useCallback(
    (strokeId: number, tool: string, color: string, width: number, points: Point[]) => {
      if (!isConnected || connectionState.peerCount === 0) return;

      const message: StrokeCompleteMessage = {
        type: StrokeMessageType.STROKE_COMPLETE,
        strokeId,
        tool: toolNameToEnum(tool),
        color: hexToPackedColor(color),
        width,
        points,
      };

      broadcast(encodeStrokeMessage(message));
    },
    [broadcast, isConnected, connectionState.peerCount]
  );

  return {
    sendStrokeStart,
    sendStrokePoint,
    sendStrokeEnd,
    sendStrokeComplete,
    isP2PEnabled: isConnected && connectionState.peerCount > 0,
  };
}
