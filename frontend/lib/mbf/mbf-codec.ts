/**
 * MBF (MPS Binary Format) Codec for TypeScript
 *
 * High-performance binary encoding/decoding that matches the Rust NIF implementation.
 * Uses big-endian byte order and includes magic bytes for protocol validation.
 *
 * Binary Format:
 * | Magic (2) | Version (1) | Flags (1) | Type (1) | Payload (variable) |
 *
 * Message Types:
 *   0x10 = StrokeSync     (real-time point sync)
 *   0x11 = StrokeEnd      (drawing ended)
 *   0x12 = StrokeComplete (finalized stroke)
 *   0x13 = StrokeAck      (acknowledgment)
 *   0x20 = CanvasClear    (clear canvas)
 *   0x30 = RoomState      (initial room state)
 */

// ============================================================================
// Constants
// ============================================================================

const MAGIC = new Uint8Array([0x4D, 0x50]); // "MP"
const VERSION = 0x01;

export enum MBFMessageType {
  STROKE_SYNC = 0x10,
  STROKE_END = 0x11,
  STROKE_COMPLETE = 0x12,
  STROKE_ACK = 0x13,
  CANVAS_CLEAR = 0x20,
  ROOM_STATE = 0x30,
}

// ============================================================================
// Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface StrokeId {
  userHash: number;
  timestamp: number;
}

export interface StrokeSyncMessage {
  type: MBFMessageType.STROKE_SYNC;
  strokeId: StrokeId;
  color: Color;
  width: number;
  points: Point[];
}

export interface StrokeCompleteMessage {
  type: MBFMessageType.STROKE_COMPLETE;
  messageId: bigint;
  tool: number;
  color: Color;
  width: number;
  timestamp: bigint;
  points: Point[];
}

export interface StrokeAckMessage {
  type: MBFMessageType.STROKE_ACK;
  messageId: bigint;
  strokeId: StrokeId;
  success: boolean;
}

export interface CanvasClearMessage {
  type: MBFMessageType.CANVAS_CLEAR;
  timestamp: bigint;
}

export type MBFMessage =
  | StrokeSyncMessage
  | StrokeCompleteMessage
  | StrokeAckMessage
  | CanvasClearMessage;

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Encode StrokeSync message to MBF binary format
 * Format: [header:4][type:1][strokeId:8][color:3][width:1][pointCount:2][points:4*n]
 */
export function encodeStrokeSync(message: Omit<StrokeSyncMessage, 'type'>): ArrayBuffer {
  const pointCount = message.points.length;
  const size = 4 + 1 + 8 + 3 + 1 + 2 + (pointCount * 4);
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;

  // Header
  bytes.set(MAGIC, offset);
  offset += 2;
  view.setUint8(offset++, VERSION);
  view.setUint8(offset++, 0x00); // flags

  // Message type
  view.setUint8(offset++, MBFMessageType.STROKE_SYNC);

  // Stroke ID (8 bytes: userHash:u32 + timestamp:u32)
  view.setUint32(offset, message.strokeId.userHash, false); // big-endian
  offset += 4;
  view.setUint32(offset, message.strokeId.timestamp, false);
  offset += 4;

  // Color (3 bytes)
  view.setUint8(offset++, message.color.r);
  view.setUint8(offset++, message.color.g);
  view.setUint8(offset++, message.color.b);

  // Width (1 byte)
  view.setUint8(offset++, Math.min(255, message.width));

  // Points count (2 bytes)
  view.setUint16(offset, pointCount, false);
  offset += 2;

  // Points (4 bytes each)
  for (const point of message.points) {
    view.setUint16(offset, Math.floor(point.x), false);
    offset += 2;
    view.setUint16(offset, Math.floor(point.y), false);
    offset += 2;
  }

  return buffer;
}

/**
 * Encode StrokeComplete message to MBF binary format
 * Format: [header:4][type:1][messageId:8][tool:1][color:3][width:1][timestamp:8][pointCount:2][points:4*n]
 */
export function encodeStrokeComplete(message: Omit<StrokeCompleteMessage, 'type'>): ArrayBuffer {
  const pointCount = message.points.length;
  const size = 4 + 1 + 8 + 1 + 3 + 1 + 8 + 2 + (pointCount * 4);
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;

  // Header
  bytes.set(MAGIC, offset);
  offset += 2;
  view.setUint8(offset++, VERSION);
  view.setUint8(offset++, 0x00);

  // Message type
  view.setUint8(offset++, MBFMessageType.STROKE_COMPLETE);

  // Message ID (8 bytes)
  view.setBigUint64(offset, message.messageId, false);
  offset += 8;

  // Tool (1 byte)
  view.setUint8(offset++, message.tool);

  // Color (3 bytes)
  view.setUint8(offset++, message.color.r);
  view.setUint8(offset++, message.color.g);
  view.setUint8(offset++, message.color.b);

  // Width (1 byte)
  view.setUint8(offset++, Math.min(255, message.width));

  // Timestamp (8 bytes)
  view.setBigUint64(offset, message.timestamp, false);
  offset += 8;

  // Points
  view.setUint16(offset, pointCount, false);
  offset += 2;

  for (const point of message.points) {
    view.setUint16(offset, Math.floor(point.x), false);
    offset += 2;
    view.setUint16(offset, Math.floor(point.y), false);
    offset += 2;
  }

  return buffer;
}

/**
 * Encode StrokeAck message to MBF binary format
 * Format: [header:4][type:1][messageId:8][strokeId:8][success:1]
 */
export function encodeStrokeAck(message: Omit<StrokeAckMessage, 'type'>): ArrayBuffer {
  const buffer = new ArrayBuffer(4 + 1 + 8 + 8 + 1);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;

  // Header
  bytes.set(MAGIC, offset);
  offset += 2;
  view.setUint8(offset++, VERSION);
  view.setUint8(offset++, 0x00);

  // Message type
  view.setUint8(offset++, MBFMessageType.STROKE_ACK);

  // Message ID
  view.setBigUint64(offset, message.messageId, false);
  offset += 8;

  // Stroke ID
  view.setUint32(offset, message.strokeId.userHash, false);
  offset += 4;
  view.setUint32(offset, message.strokeId.timestamp, false);
  offset += 4;

  // Success
  view.setUint8(offset, message.success ? 1 : 0);

  return buffer;
}

// ============================================================================
// Decoding Functions
// ============================================================================

/**
 * Validate MBF header and return message type
 */
export function validateHeader(buffer: ArrayBuffer): MBFMessageType | null {
  if (buffer.byteLength < 5) return null;

  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Check magic
  if (bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1]) {
    console.warn('Invalid MBF magic bytes');
    return null;
  }

  // Check version
  if (view.getUint8(2) !== VERSION) {
    console.warn('Unsupported MBF version:', view.getUint8(2));
    return null;
  }

  return view.getUint8(4) as MBFMessageType;
}

/**
 * Decode MBF binary to message object
 */
export function decodeMBF(buffer: ArrayBuffer): MBFMessage | null {
  const messageType = validateHeader(buffer);
  if (messageType === null) return null;

  switch (messageType) {
    case MBFMessageType.STROKE_SYNC:
      return decodeStrokeSync(buffer);
    case MBFMessageType.STROKE_COMPLETE:
      return decodeStrokeComplete(buffer);
    case MBFMessageType.STROKE_ACK:
      return decodeStrokeAck(buffer);
    default:
      console.warn('Unknown MBF message type:', messageType);
      return null;
  }
}

function decodeStrokeSync(buffer: ArrayBuffer): StrokeSyncMessage | null {
  const view = new DataView(buffer);

  if (buffer.byteLength < 19) return null; // minimum size without points

  let offset = 5; // skip header + type

  // Stroke ID
  const userHash = view.getUint32(offset, false);
  offset += 4;
  const timestamp = view.getUint32(offset, false);
  offset += 4;

  // Color
  const r = view.getUint8(offset++);
  const g = view.getUint8(offset++);
  const b = view.getUint8(offset++);

  // Width
  const width = view.getUint8(offset++);

  // Points count
  const pointCount = view.getUint16(offset, false);
  offset += 2;

  // Validate buffer size
  const expectedSize = offset + (pointCount * 4);
  if (buffer.byteLength < expectedSize) return null;

  // Points
  const points: Point[] = [];
  for (let i = 0; i < pointCount; i++) {
    points.push({
      x: view.getUint16(offset, false),
      y: view.getUint16(offset + 2, false),
    });
    offset += 4;
  }

  return {
    type: MBFMessageType.STROKE_SYNC,
    strokeId: { userHash, timestamp },
    color: { r, g, b },
    width,
    points,
  };
}

function decodeStrokeComplete(buffer: ArrayBuffer): StrokeCompleteMessage | null {
  const view = new DataView(buffer);

  if (buffer.byteLength < 28) return null; // minimum size without points

  let offset = 5; // skip header + type

  // Message ID
  const messageId = view.getBigUint64(offset, false);
  offset += 8;

  // Tool
  const tool = view.getUint8(offset++);

  // Color
  const r = view.getUint8(offset++);
  const g = view.getUint8(offset++);
  const b = view.getUint8(offset++);

  // Width
  const width = view.getUint8(offset++);

  // Timestamp
  const timestamp = view.getBigUint64(offset, false);
  offset += 8;

  // Points count
  const pointCount = view.getUint16(offset, false);
  offset += 2;

  // Validate buffer size
  const expectedSize = offset + (pointCount * 4);
  if (buffer.byteLength < expectedSize) return null;

  // Points
  const points: Point[] = [];
  for (let i = 0; i < pointCount; i++) {
    points.push({
      x: view.getUint16(offset, false),
      y: view.getUint16(offset + 2, false),
    });
    offset += 4;
  }

  return {
    type: MBFMessageType.STROKE_COMPLETE,
    messageId,
    tool,
    color: { r, g, b },
    width,
    timestamp,
    points,
  };
}

function decodeStrokeAck(buffer: ArrayBuffer): StrokeAckMessage | null {
  const view = new DataView(buffer);

  if (buffer.byteLength < 22) return null;

  let offset = 5; // skip header + type

  // Message ID
  const messageId = view.getBigUint64(offset, false);
  offset += 8;

  // Stroke ID
  const userHash = view.getUint32(offset, false);
  offset += 4;
  const timestamp = view.getUint32(offset, false);
  offset += 4;

  // Success
  const success = view.getUint8(offset) === 1;

  return {
    type: MBFMessageType.STROKE_ACK,
    messageId,
    strokeId: { userHash, timestamp },
    success,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Hash user ID string to 32-bit integer (matches Rust implementation)
 */
export function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = Math.imul(hash, 31) + userId.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit
  }
  return hash;
}

/**
 * Parse hex color to Color object
 */
export function hexToColor(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert Color object to hex string
 */
export function colorToHex(color: Color): string {
  return `#${((1 << 24) | (color.r << 16) | (color.g << 8) | color.b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

/**
 * Create StrokeId from user ID string and optional timestamp
 */
export function createStrokeId(userId: string, timestamp?: number): StrokeId {
  return {
    userHash: hashUserId(userId),
    timestamp: (timestamp ?? Date.now()) & 0xFFFFFFFF,
  };
}

/**
 * Debug helper: pretty print binary data
 */
export function debugMBF(buffer: ArrayBuffer): void {
  const bytes = new Uint8Array(buffer);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');

  console.log(`MBF Binary (${buffer.byteLength} bytes):`);
  console.log(hex);

  const decoded = decodeMBF(buffer);
  if (decoded) {
    console.log('Decoded:', decoded);
  } else {
    console.log('Failed to decode');
  }
}

/**
 * Tool name to number conversion
 */
export function toolNameToNumber(tool: string): number {
  switch (tool.toLowerCase()) {
    case 'pen':
      return 0;
    case 'eraser':
      return 1;
    case 'fill':
    case 'bucket':
      return 2;
    default:
      return 0;
  }
}

/**
 * Number to tool name conversion
 */
export function numberToToolName(tool: number): string {
  switch (tool) {
    case 0:
      return 'pen';
    case 1:
      return 'eraser';
    case 2:
      return 'fill';
    default:
      return `unknown_${tool}`;
  }
}
