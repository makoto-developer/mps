/**
 * MBF Codec Tests
 */

import {
  MBFMessageType,
  encodeStrokeSync,
  encodeStrokeComplete,
  encodeStrokeAck,
  decodeMBF,
  validateHeader,
  hashUserId,
  hexToColor,
  colorToHex,
  createStrokeId,
  toolNameToNumber,
  numberToToolName,
  type StrokeSyncMessage,
  type StrokeCompleteMessage,
} from './mbf-codec';

describe('MBF Codec', () => {
  describe('encodeStrokeSync', () => {
    it('should encode StrokeSync message correctly', () => {
      const message = {
        strokeId: { userHash: 0x12345678, timestamp: 0x9ABCDEF0 },
        color: { r: 255, g: 0, b: 0 },
        width: 5,
        points: [
          { x: 100, y: 200 },
          { x: 105, y: 210 },
        ],
      };

      const buffer = encodeStrokeSync(message);
      const bytes = new Uint8Array(buffer);

      // Check magic bytes
      expect(bytes[0]).toBe(0x4D); // 'M'
      expect(bytes[1]).toBe(0x50); // 'P'

      // Check version
      expect(bytes[2]).toBe(0x01);

      // Check flags
      expect(bytes[3]).toBe(0x00);

      // Check message type
      expect(bytes[4]).toBe(0x10); // STROKE_SYNC
    });

    it('should handle empty points array', () => {
      const message = {
        strokeId: { userHash: 0, timestamp: 0 },
        color: { r: 0, g: 0, b: 0 },
        width: 1,
        points: [],
      };

      const buffer = encodeStrokeSync(message);
      expect(buffer.byteLength).toBe(4 + 1 + 8 + 3 + 1 + 2); // header + type + strokeId + color + width + pointCount
    });
  });

  describe('encodeStrokeComplete', () => {
    it('should encode StrokeComplete message correctly', () => {
      const message = {
        messageId: BigInt(12345),
        tool: 0,
        color: { r: 0, g: 255, b: 0 },
        width: 8,
        timestamp: BigInt(Date.now()),
        points: [{ x: 50, y: 50 }],
      };

      const buffer = encodeStrokeComplete(message);
      const bytes = new Uint8Array(buffer);

      // Check magic bytes
      expect(bytes[0]).toBe(0x4D);
      expect(bytes[1]).toBe(0x50);

      // Check message type
      expect(bytes[4]).toBe(0x12); // STROKE_COMPLETE
    });
  });

  describe('decodeMBF', () => {
    it('should decode StrokeSync message', () => {
      const original = {
        strokeId: { userHash: 0x12345678, timestamp: 0x9ABCDEF0 },
        color: { r: 255, g: 128, b: 64 },
        width: 10,
        points: [
          { x: 100, y: 200 },
          { x: 150, y: 250 },
          { x: 200, y: 300 },
        ],
      };

      const buffer = encodeStrokeSync(original);
      const decoded = decodeMBF(buffer);

      expect(decoded).not.toBeNull();
      expect(decoded!.type).toBe(MBFMessageType.STROKE_SYNC);

      const msg = decoded as StrokeSyncMessage;
      expect(msg.strokeId.userHash).toBe(original.strokeId.userHash);
      expect(msg.strokeId.timestamp).toBe(original.strokeId.timestamp);
      expect(msg.color.r).toBe(original.color.r);
      expect(msg.color.g).toBe(original.color.g);
      expect(msg.color.b).toBe(original.color.b);
      expect(msg.width).toBe(original.width);
      expect(msg.points).toHaveLength(3);
      expect(msg.points[0]).toEqual({ x: 100, y: 200 });
    });

    it('should decode StrokeComplete message', () => {
      const original = {
        messageId: BigInt(99999),
        tool: 1, // eraser
        color: { r: 0, g: 0, b: 255 },
        width: 20,
        timestamp: BigInt(1234567890123),
        points: [{ x: 500, y: 600 }],
      };

      const buffer = encodeStrokeComplete(original);
      const decoded = decodeMBF(buffer);

      expect(decoded).not.toBeNull();
      expect(decoded!.type).toBe(MBFMessageType.STROKE_COMPLETE);

      const msg = decoded as StrokeCompleteMessage;
      expect(msg.messageId).toBe(original.messageId);
      expect(msg.tool).toBe(original.tool);
      expect(msg.color.b).toBe(255);
    });

    it('should return null for invalid buffer', () => {
      const invalidBuffer = new ArrayBuffer(2);
      expect(decodeMBF(invalidBuffer)).toBeNull();
    });

    it('should return null for wrong magic bytes', () => {
      const buffer = new ArrayBuffer(10);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x00;
      bytes[1] = 0x00;

      expect(decodeMBF(buffer)).toBeNull();
    });
  });

  describe('validateHeader', () => {
    it('should return message type for valid header', () => {
      const buffer = encodeStrokeSync({
        strokeId: { userHash: 0, timestamp: 0 },
        color: { r: 0, g: 0, b: 0 },
        width: 1,
        points: [],
      });

      expect(validateHeader(buffer)).toBe(MBFMessageType.STROKE_SYNC);
    });

    it('should return null for buffer too small', () => {
      expect(validateHeader(new ArrayBuffer(4))).toBeNull();
    });
  });

  describe('hashUserId', () => {
    it('should produce consistent hash', () => {
      const hash1 = hashUserId('user123');
      const hash2 = hashUserId('user123');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different IDs', () => {
      const hash1 = hashUserId('user123');
      const hash2 = hashUserId('user456');

      expect(hash1).not.toBe(hash2);
    });

    it('should return unsigned 32-bit integer', () => {
      const hash = hashUserId('test');

      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xFFFFFFFF);
    });
  });

  describe('color utilities', () => {
    it('should convert hex to color', () => {
      const color = hexToColor('#FF8040');

      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(64);
    });

    it('should handle hex without hash', () => {
      const color = hexToColor('00FF00');

      expect(color.r).toBe(0);
      expect(color.g).toBe(255);
      expect(color.b).toBe(0);
    });

    it('should convert color to hex', () => {
      const hex = colorToHex({ r: 255, g: 128, b: 64 });

      expect(hex).toBe('#FF8040');
    });

    it('should handle lowercase hex', () => {
      const color = hexToColor('#aabbcc');

      expect(color.r).toBe(170);
      expect(color.g).toBe(187);
      expect(color.b).toBe(204);
    });
  });

  describe('createStrokeId', () => {
    it('should create stroke ID from user ID', () => {
      const strokeId = createStrokeId('user123');

      expect(strokeId.userHash).toBe(hashUserId('user123'));
      expect(strokeId.timestamp).toBeGreaterThan(0);
    });

    it('should use provided timestamp', () => {
      const strokeId = createStrokeId('user123', 1234567890);

      expect(strokeId.timestamp).toBe(1234567890);
    });
  });

  describe('tool conversion', () => {
    it('should convert tool names to numbers', () => {
      expect(toolNameToNumber('pen')).toBe(0);
      expect(toolNameToNumber('eraser')).toBe(1);
      expect(toolNameToNumber('fill')).toBe(2);
      expect(toolNameToNumber('bucket')).toBe(2);
    });

    it('should convert numbers to tool names', () => {
      expect(numberToToolName(0)).toBe('pen');
      expect(numberToToolName(1)).toBe('eraser');
      expect(numberToToolName(2)).toBe('fill');
      expect(numberToToolName(99)).toBe('unknown_99');
    });
  });

  describe('roundtrip encoding/decoding', () => {
    it('should preserve data through encode/decode cycle', () => {
      const original = {
        strokeId: createStrokeId('testuser'),
        color: { r: 123, g: 45, b: 67 },
        width: 15,
        points: [
          { x: 0, y: 0 },
          { x: 1000, y: 1000 },
          { x: 500, y: 500 },
        ],
      };

      const buffer = encodeStrokeSync(original);
      const decoded = decodeMBF(buffer) as StrokeSyncMessage;

      expect(decoded.strokeId.userHash).toBe(original.strokeId.userHash);
      expect(decoded.strokeId.timestamp).toBe(original.strokeId.timestamp);
      expect(decoded.color).toEqual(original.color);
      expect(decoded.width).toBe(original.width);
      expect(decoded.points).toEqual(original.points);
    });
  });
});
