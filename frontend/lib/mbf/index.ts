/**
 * MBF (MPS Binary Format) - TypeScript Client Library
 *
 * Provides binary encoding/decoding for high-performance
 * real-time drawing synchronization.
 *
 * Compatible with the Rust NIF implementation on the server side.
 *
 * @example
 * ```typescript
 * import { MBF } from '@/lib/mbf';
 *
 * // Encode stroke sync message
 * const binary = MBF.encodeStrokeSync({
 *   strokeId: MBF.createStrokeId('user123'),
 *   color: MBF.hexToColor('#FF0000'),
 *   width: 5,
 *   points: [{ x: 100, y: 200 }, { x: 105, y: 210 }]
 * });
 *
 * // Send as binary
 * channel.push('stroke_sync', binary);
 *
 * // Decode received binary
 * const message = MBF.decode(receivedBinary);
 * ```
 */

export {
  // Types
  type Point,
  type Color,
  type StrokeId,
  type StrokeSyncMessage,
  type StrokeCompleteMessage,
  type StrokeAckMessage,
  type CanvasClearMessage,
  type MBFMessage,

  // Enums
  MBFMessageType,

  // Encoding
  encodeStrokeSync,
  encodeStrokeComplete,
  encodeStrokeAck,

  // Decoding
  validateHeader,
  decodeMBF,

  // Utilities
  hashUserId,
  hexToColor,
  colorToHex,
  createStrokeId,
  debugMBF,
  toolNameToNumber,
  numberToToolName,
} from './mbf-codec';

// Convenience namespace for grouped access
import * as MBFCodec from './mbf-codec';
export const MBF = {
  // Encoding
  encodeStrokeSync: MBFCodec.encodeStrokeSync,
  encodeStrokeComplete: MBFCodec.encodeStrokeComplete,
  encodeStrokeAck: MBFCodec.encodeStrokeAck,

  // Decoding
  decode: MBFCodec.decodeMBF,
  validateHeader: MBFCodec.validateHeader,

  // Utilities
  hashUserId: MBFCodec.hashUserId,
  hexToColor: MBFCodec.hexToColor,
  colorToHex: MBFCodec.colorToHex,
  createStrokeId: MBFCodec.createStrokeId,
  debug: MBFCodec.debugMBF,
  toolNameToNumber: MBFCodec.toolNameToNumber,
  numberToToolName: MBFCodec.numberToToolName,

  // Message Types
  MessageType: MBFCodec.MBFMessageType,
};
