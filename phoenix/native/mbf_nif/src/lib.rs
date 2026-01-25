//! MBF (MPS Binary Format) - High-performance encoder/decoder
//!
//! This NIF provides fast binary encoding/decoding for the drawing app protocol.
//! Generated from MPS DSL definition.

use rustler::{Binary, Env, NifStruct, OwnedBinary};

// ============================================================================
// Data Types
// ============================================================================

/// Point coordinate (4 bytes: x:u16 + y:u16)
#[derive(Debug, Clone, Copy, NifStruct)]
#[module = "MBF.Point"]
pub struct Point {
    pub x: u16,
    pub y: u16,
}

/// RGB Color (3 bytes)
#[derive(Debug, Clone, Copy, NifStruct)]
#[module = "MBF.Color"]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

/// Stroke ID (8 bytes: user_hash:u32 + timestamp:u32)
#[derive(Debug, Clone, Copy, NifStruct)]
#[module = "MBF.StrokeId"]
pub struct StrokeId {
    pub user_hash: u32,
    pub timestamp: u32,
}

// ============================================================================
// Message Types
// ============================================================================

/// Message type identifiers
#[repr(u8)]
pub enum MessageType {
    StrokeSync = 0x10,
    StrokeEnd = 0x11,
    StrokeComplete = 0x12,
    StrokeAck = 0x13,
    CanvasClear = 0x20,
    RoomState = 0x30,
}

/// StrokeSync message for real-time point synchronization
#[derive(Debug, Clone, NifStruct)]
#[module = "MBF.StrokeSync"]
pub struct StrokeSync {
    pub stroke_id: StrokeId,
    pub color: Color,
    pub width: u8,
    pub points: Vec<Point>,
}

/// StrokeComplete message for finalized strokes
#[derive(Debug, Clone, NifStruct)]
#[module = "MBF.StrokeComplete"]
pub struct StrokeComplete {
    pub message_id: u64,
    pub tool: u8,
    pub color: Color,
    pub width: u8,
    pub timestamp: u64,
    pub points: Vec<Point>,
}

/// StrokeAck message for acknowledgment
#[derive(Debug, Clone, NifStruct)]
#[module = "MBF.StrokeAck"]
pub struct StrokeAck {
    pub message_id: u64,
    pub stroke_id: StrokeId,
    pub success: bool,
}

// ============================================================================
// Constants
// ============================================================================

const MAGIC: [u8; 2] = [0x4D, 0x50]; // "MP"
const VERSION: u8 = 0x01;

// ============================================================================
// Encoding Functions
// ============================================================================

/// Encode a StrokeSync message to binary
#[rustler::nif]
fn encode_stroke_sync<'a>(env: Env<'a>, msg: StrokeSync) -> Result<Binary<'a>, String> {
    let points_count = msg.points.len();
    let size = 4 + 1 + 8 + 3 + 1 + 2 + (points_count * 4);

    let mut buf = Vec::with_capacity(size);

    // Header
    buf.extend_from_slice(&MAGIC);
    buf.push(VERSION);
    buf.push(0x00); // flags

    // Message type
    buf.push(MessageType::StrokeSync as u8);

    // Stroke ID (8 bytes)
    buf.extend_from_slice(&msg.stroke_id.user_hash.to_be_bytes());
    buf.extend_from_slice(&msg.stroke_id.timestamp.to_be_bytes());

    // Color (3 bytes)
    buf.push(msg.color.r);
    buf.push(msg.color.g);
    buf.push(msg.color.b);

    // Width (1 byte)
    buf.push(msg.width);

    // Points count (2 bytes)
    buf.extend_from_slice(&(points_count as u16).to_be_bytes());

    // Points (4 bytes each)
    for point in &msg.points {
        buf.extend_from_slice(&point.x.to_be_bytes());
        buf.extend_from_slice(&point.y.to_be_bytes());
    }

    vec_to_binary(env, buf)
}

/// Encode a StrokeComplete message to binary
#[rustler::nif]
fn encode_stroke_complete<'a>(env: Env<'a>, msg: StrokeComplete) -> Result<Binary<'a>, String> {
    let points_count = msg.points.len();
    let size = 4 + 1 + 8 + 1 + 3 + 1 + 8 + 2 + (points_count * 4);

    let mut buf = Vec::with_capacity(size);

    // Header
    buf.extend_from_slice(&MAGIC);
    buf.push(VERSION);
    buf.push(0x00);

    // Message type
    buf.push(MessageType::StrokeComplete as u8);

    // Message ID (8 bytes)
    buf.extend_from_slice(&msg.message_id.to_be_bytes());

    // Tool (1 byte)
    buf.push(msg.tool);

    // Color (3 bytes)
    buf.push(msg.color.r);
    buf.push(msg.color.g);
    buf.push(msg.color.b);

    // Width (1 byte)
    buf.push(msg.width);

    // Timestamp (8 bytes)
    buf.extend_from_slice(&msg.timestamp.to_be_bytes());

    // Points
    buf.extend_from_slice(&(points_count as u16).to_be_bytes());
    for point in &msg.points {
        buf.extend_from_slice(&point.x.to_be_bytes());
        buf.extend_from_slice(&point.y.to_be_bytes());
    }

    vec_to_binary(env, buf)
}

/// Encode a StrokeAck message to binary
#[rustler::nif]
fn encode_stroke_ack<'a>(env: Env<'a>, msg: StrokeAck) -> Result<Binary<'a>, String> {
    let mut buf = Vec::with_capacity(4 + 1 + 8 + 8 + 1);

    // Header
    buf.extend_from_slice(&MAGIC);
    buf.push(VERSION);
    buf.push(0x00);

    // Message type
    buf.push(MessageType::StrokeAck as u8);

    // Message ID
    buf.extend_from_slice(&msg.message_id.to_be_bytes());

    // Stroke ID
    buf.extend_from_slice(&msg.stroke_id.user_hash.to_be_bytes());
    buf.extend_from_slice(&msg.stroke_id.timestamp.to_be_bytes());

    // Success
    buf.push(if msg.success { 1 } else { 0 });

    vec_to_binary(env, buf)
}

// ============================================================================
// Decoding Functions
// ============================================================================

/// Decode binary to StrokeSync message
#[rustler::nif]
fn decode_stroke_sync(binary: Binary) -> Result<StrokeSync, String> {
    let data = binary.as_slice();

    // Validate header
    if data.len() < 5 {
        return Err("Buffer too small".to_string());
    }

    if data[0..2] != MAGIC {
        return Err("Invalid magic bytes".to_string());
    }

    if data[2] != VERSION {
        return Err(format!("Unsupported version: {}", data[2]));
    }

    if data[4] != MessageType::StrokeSync as u8 {
        return Err(format!("Expected StrokeSync (0x10), got 0x{:02X}", data[4]));
    }

    let mut offset = 5;

    // Stroke ID
    let user_hash = u32::from_be_bytes([data[offset], data[offset+1], data[offset+2], data[offset+3]]);
    offset += 4;
    let timestamp = u32::from_be_bytes([data[offset], data[offset+1], data[offset+2], data[offset+3]]);
    offset += 4;

    // Color
    let r = data[offset];
    let g = data[offset + 1];
    let b = data[offset + 2];
    offset += 3;

    // Width
    let width = data[offset];
    offset += 1;

    // Points count
    let points_count = u16::from_be_bytes([data[offset], data[offset+1]]) as usize;
    offset += 2;

    // Points
    let mut points = Vec::with_capacity(points_count);
    for _ in 0..points_count {
        let x = u16::from_be_bytes([data[offset], data[offset+1]]);
        let y = u16::from_be_bytes([data[offset+2], data[offset+3]]);
        points.push(Point { x, y });
        offset += 4;
    }

    Ok(StrokeSync {
        stroke_id: StrokeId { user_hash, timestamp },
        color: Color { r, g, b },
        width,
        points,
    })
}

/// Decode binary to StrokeComplete message
#[rustler::nif]
fn decode_stroke_complete(binary: Binary) -> Result<StrokeComplete, String> {
    let data = binary.as_slice();

    if data.len() < 5 || data[0..2] != MAGIC {
        return Err("Invalid buffer".to_string());
    }

    if data[4] != MessageType::StrokeComplete as u8 {
        return Err(format!("Expected StrokeComplete (0x12), got 0x{:02X}", data[4]));
    }

    let mut offset = 5;

    // Message ID
    let message_id = u64::from_be_bytes([
        data[offset], data[offset+1], data[offset+2], data[offset+3],
        data[offset+4], data[offset+5], data[offset+6], data[offset+7]
    ]);
    offset += 8;

    // Tool
    let tool = data[offset];
    offset += 1;

    // Color
    let color = Color {
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
    };
    offset += 3;

    // Width
    let width = data[offset];
    offset += 1;

    // Timestamp
    let timestamp = u64::from_be_bytes([
        data[offset], data[offset+1], data[offset+2], data[offset+3],
        data[offset+4], data[offset+5], data[offset+6], data[offset+7]
    ]);
    offset += 8;

    // Points
    let points_count = u16::from_be_bytes([data[offset], data[offset+1]]) as usize;
    offset += 2;

    let mut points = Vec::with_capacity(points_count);
    for _ in 0..points_count {
        let x = u16::from_be_bytes([data[offset], data[offset+1]]);
        let y = u16::from_be_bytes([data[offset+2], data[offset+3]]);
        points.push(Point { x, y });
        offset += 4;
    }

    Ok(StrokeComplete {
        message_id,
        tool,
        color,
        width,
        timestamp,
        points,
    })
}

/// Decode message type from binary (for routing)
#[rustler::nif]
fn decode_message_type(binary: Binary) -> Result<u8, String> {
    let data = binary.as_slice();

    if data.len() < 5 {
        return Err("Buffer too small".to_string());
    }

    if data[0..2] != MAGIC {
        return Err("Invalid magic bytes".to_string());
    }

    Ok(data[4])
}

// ============================================================================
// Utility Functions
// ============================================================================

/// Convert hex color string to Color struct
#[rustler::nif]
fn hex_to_color(hex: String) -> Result<Color, String> {
    let hex = hex.trim_start_matches('#');

    if hex.len() != 6 {
        return Err("Invalid hex color length".to_string());
    }

    let r = u8::from_str_radix(&hex[0..2], 16).map_err(|e| e.to_string())?;
    let g = u8::from_str_radix(&hex[2..4], 16).map_err(|e| e.to_string())?;
    let b = u8::from_str_radix(&hex[4..6], 16).map_err(|e| e.to_string())?;

    Ok(Color { r, g, b })
}

/// Convert Color struct to hex string
#[rustler::nif]
fn color_to_hex(color: Color) -> String {
    format!("#{:02X}{:02X}{:02X}", color.r, color.g, color.b)
}

/// Calculate hash from user ID string
#[rustler::nif]
fn hash_user_id(user_id: String) -> u32 {
    let mut hash: u32 = 0;
    for byte in user_id.bytes() {
        hash = hash.wrapping_mul(31).wrapping_add(byte as u32);
    }
    hash
}

// ============================================================================
// Helper Functions
// ============================================================================

fn vec_to_binary<'a>(env: Env<'a>, vec: Vec<u8>) -> Result<Binary<'a>, String> {
    let mut binary = OwnedBinary::new(vec.len()).ok_or("Failed to allocate binary")?;
    binary.as_mut_slice().copy_from_slice(&vec);
    Ok(binary.release(env))
}

// ============================================================================
// NIF Registration
// ============================================================================

rustler::init!(
    "Elixir.MBF.Native",
    [
        encode_stroke_sync,
        encode_stroke_complete,
        encode_stroke_ack,
        decode_stroke_sync,
        decode_stroke_complete,
        decode_message_type,
        hex_to_color,
        color_to_hex,
        hash_user_id,
    ]
);
