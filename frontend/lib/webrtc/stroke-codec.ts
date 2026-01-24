/**
 * Binary Stroke Codec
 *
 * Efficient binary encoding/decoding for stroke data.
 * Reduces bandwidth by ~70% compared to JSON.
 *
 * Message Format:
 * | Header (1 byte) | Payload (variable) |
 *
 * Message Types:
 *   0x10 = STROKE_START  (10 bytes: tool, color, width, strokeId)
 *   0x20 = STROKE_POINT  (9 bytes: strokeId, x, y)
 *   0x30 = STROKE_END    (5 bytes: strokeId)
 *   0x40 = STROKE_COMPLETE (variable: full stroke)
 */

export enum StrokeMessageType {
  STROKE_START = 0x10,
  STROKE_POINT = 0x20,
  STROKE_END = 0x30,
  STROKE_COMPLETE = 0x40,
}

export interface StrokeStartMessage {
  type: StrokeMessageType.STROKE_START;
  strokeId: number;
  tool: StrokeTool;
  color: number; // RGB packed as 24-bit integer
  width: number;
}

export interface StrokePointMessage {
  type: StrokeMessageType.STROKE_POINT;
  strokeId: number;
  x: number;
  y: number;
}

export interface StrokeEndMessage {
  type: StrokeMessageType.STROKE_END;
  strokeId: number;
}

export interface StrokeCompleteMessage {
  type: StrokeMessageType.STROKE_COMPLETE;
  strokeId: number;
  tool: StrokeTool;
  color: number;
  width: number;
  points: Array<{ x: number; y: number }>;
}

export type StrokeMessage =
  | StrokeStartMessage
  | StrokePointMessage
  | StrokeEndMessage
  | StrokeCompleteMessage;

export enum StrokeTool {
  PEN = 0,
  ERASER = 1,
  BUCKET = 2,
}

/**
 * Pack RGB color to 24-bit integer
 */
export function packColor(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

/**
 * Unpack 24-bit integer to RGB
 */
export function unpackColor(packed: number): { r: number; g: number; b: number } {
  return {
    r: (packed >> 16) & 0xff,
    g: (packed >> 8) & 0xff,
    b: packed & 0xff,
  };
}

/**
 * Parse hex color string to packed integer
 */
export function hexToPackedColor(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;
  return packColor(
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  );
}

/**
 * Convert packed color to hex string
 */
export function packedColorToHex(packed: number): string {
  const { r, g, b } = unpackColor(packed);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Encode StrokeStartMessage to binary
 * Format: [type:1][strokeId:4][tool:1][color:3][width:1] = 10 bytes
 */
export function encodeStrokeStart(message: StrokeStartMessage): ArrayBuffer {
  const buffer = new ArrayBuffer(10);
  const view = new DataView(buffer);

  view.setUint8(0, message.type);
  view.setUint32(1, message.strokeId, true); // little-endian
  view.setUint8(5, message.tool);
  // Color as 3 bytes
  view.setUint8(6, (message.color >> 16) & 0xff);
  view.setUint8(7, (message.color >> 8) & 0xff);
  view.setUint8(8, message.color & 0xff);
  view.setUint8(9, Math.min(255, message.width));

  return buffer;
}

/**
 * Encode StrokePointMessage to binary
 * Format: [type:1][strokeId:4][x:2][y:2] = 9 bytes
 */
export function encodeStrokePoint(message: StrokePointMessage): ArrayBuffer {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);

  view.setUint8(0, message.type);
  view.setUint32(1, message.strokeId, true);
  view.setUint16(5, Math.floor(message.x), true);
  view.setUint16(7, Math.floor(message.y), true);

  return buffer;
}

/**
 * Encode StrokeEndMessage to binary
 * Format: [type:1][strokeId:4] = 5 bytes
 */
export function encodeStrokeEnd(message: StrokeEndMessage): ArrayBuffer {
  const buffer = new ArrayBuffer(5);
  const view = new DataView(buffer);

  view.setUint8(0, message.type);
  view.setUint32(1, message.strokeId, true);

  return buffer;
}

/**
 * Encode StrokeCompleteMessage to binary
 * Format: [type:1][strokeId:4][tool:1][color:3][width:1][pointCount:2][points:4*n]
 */
export function encodeStrokeComplete(message: StrokeCompleteMessage): ArrayBuffer {
  const headerSize = 12; // type + strokeId + tool + color + width + pointCount
  const pointsSize = message.points.length * 4; // x:2, y:2 per point
  const buffer = new ArrayBuffer(headerSize + pointsSize);
  const view = new DataView(buffer);

  let offset = 0;

  view.setUint8(offset++, message.type);
  view.setUint32(offset, message.strokeId, true);
  offset += 4;
  view.setUint8(offset++, message.tool);
  view.setUint8(offset++, (message.color >> 16) & 0xff);
  view.setUint8(offset++, (message.color >> 8) & 0xff);
  view.setUint8(offset++, message.color & 0xff);
  view.setUint8(offset++, Math.min(255, message.width));
  view.setUint16(offset, message.points.length, true);
  offset += 2;

  for (const point of message.points) {
    view.setUint16(offset, Math.floor(point.x), true);
    offset += 2;
    view.setUint16(offset, Math.floor(point.y), true);
    offset += 2;
  }

  return buffer;
}

/**
 * Decode binary message to StrokeMessage
 */
export function decodeStrokeMessage(buffer: ArrayBuffer): StrokeMessage | null {
  const view = new DataView(buffer);

  if (buffer.byteLength < 1) return null;

  const type = view.getUint8(0);

  switch (type) {
    case StrokeMessageType.STROKE_START:
      return decodeStrokeStart(view);
    case StrokeMessageType.STROKE_POINT:
      return decodeStrokePoint(view);
    case StrokeMessageType.STROKE_END:
      return decodeStrokeEnd(view);
    case StrokeMessageType.STROKE_COMPLETE:
      return decodeStrokeComplete(view);
    default:
      console.warn('Unknown message type:', type);
      return null;
  }
}

function decodeStrokeStart(view: DataView): StrokeStartMessage | null {
  if (view.byteLength < 10) return null;

  return {
    type: StrokeMessageType.STROKE_START,
    strokeId: view.getUint32(1, true),
    tool: view.getUint8(5) as StrokeTool,
    color: (view.getUint8(6) << 16) | (view.getUint8(7) << 8) | view.getUint8(8),
    width: view.getUint8(9),
  };
}

function decodeStrokePoint(view: DataView): StrokePointMessage | null {
  if (view.byteLength < 9) return null;

  return {
    type: StrokeMessageType.STROKE_POINT,
    strokeId: view.getUint32(1, true),
    x: view.getUint16(5, true),
    y: view.getUint16(7, true),
  };
}

function decodeStrokeEnd(view: DataView): StrokeEndMessage | null {
  if (view.byteLength < 5) return null;

  return {
    type: StrokeMessageType.STROKE_END,
    strokeId: view.getUint32(1, true),
  };
}

function decodeStrokeComplete(view: DataView): StrokeCompleteMessage | null {
  if (view.byteLength < 12) return null;

  const strokeId = view.getUint32(1, true);
  const tool = view.getUint8(5) as StrokeTool;
  const color = (view.getUint8(6) << 16) | (view.getUint8(7) << 8) | view.getUint8(8);
  const width = view.getUint8(9);
  const pointCount = view.getUint16(10, true);

  const expectedSize = 12 + pointCount * 4;
  if (view.byteLength < expectedSize) return null;

  const points: Array<{ x: number; y: number }> = [];
  let offset = 12;

  for (let i = 0; i < pointCount; i++) {
    points.push({
      x: view.getUint16(offset, true),
      y: view.getUint16(offset + 2, true),
    });
    offset += 4;
  }

  return {
    type: StrokeMessageType.STROKE_COMPLETE,
    strokeId,
    tool,
    color,
    width,
    points,
  };
}

/**
 * Convenience encoder for any stroke message
 */
export function encodeStrokeMessage(message: StrokeMessage): ArrayBuffer {
  switch (message.type) {
    case StrokeMessageType.STROKE_START:
      return encodeStrokeStart(message);
    case StrokeMessageType.STROKE_POINT:
      return encodeStrokePoint(message);
    case StrokeMessageType.STROKE_END:
      return encodeStrokeEnd(message);
    case StrokeMessageType.STROKE_COMPLETE:
      return encodeStrokeComplete(message);
  }
}

/**
 * Tool name to enum conversion
 */
export function toolNameToEnum(tool: string): StrokeTool {
  switch (tool.toLowerCase()) {
    case 'eraser':
      return StrokeTool.ERASER;
    case 'bucket':
      return StrokeTool.BUCKET;
    case 'pen':
    default:
      return StrokeTool.PEN;
  }
}

/**
 * Enum to tool name conversion
 */
export function enumToToolName(tool: StrokeTool): string {
  switch (tool) {
    case StrokeTool.ERASER:
      return 'eraser';
    case StrokeTool.BUCKET:
      return 'bucket';
    case StrokeTool.PEN:
    default:
      return 'pen';
  }
}
