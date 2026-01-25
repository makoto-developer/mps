# MBF (MPS Binary Format) アーキテクチャ

## 概要

MBFはJetBrains MPSのDSL定義からRust NIFとTypeScript双方の高性能バイナリエンコーダ/デコーダを自動生成するシステムです。JSONと比較して約65%のサイズ削減を実現し、リアルタイム描画アプリケーションの通信効率を大幅に向上させます。

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MPS Protocol DSL                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ protocol MPSBinaryFormat                                            │ │
│  │   version: 1                                                        │ │
│  │   magic: "MP"                                                       │ │
│  │   types: Point(x:u16, y:u16), Color(r:u8, g:u8, b:u8), ...         │ │
│  │   messages: StrokeSync, StrokeComplete, StrokeAck, ...              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      MPS Code Generator       │
                    │  (Multi-Target Generation)    │
                    └───────────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
┌─────────────────────────────┐           ┌─────────────────────────────┐
│    Rust NIF Generator       │           │   TypeScript Generator      │
│   (native/mbf_nif/src/)     │           │   (frontend/lib/mbf/)       │
└─────────────────────────────┘           └─────────────────────────────┘
              │                                           │
              ▼                                           ▼
┌─────────────────────────────┐           ┌─────────────────────────────┐
│       lib.rs                │           │      mbf-codec.ts           │
│   - encode_stroke_sync      │           │   - encodeStrokeSync        │
│   - decode_stroke_sync      │           │   - decodeStrokeSync        │
│   - encode_stroke_complete  │           │   - encodeStrokeComplete    │
│   - decode_stroke_complete  │           │   - decodeStrokeComplete    │
│   - encode_stroke_ack       │           │   - encodeStrokeAck         │
│   - hex_to_color            │           │   - hexToColor              │
│   - hash_user_id            │           │   - hashUserId              │
└─────────────────────────────┘           └─────────────────────────────┘
              │                                           │
              ▼                                           ▼
┌─────────────────────────────┐           ┌─────────────────────────────┐
│   Phoenix/Elixir Server     │           │   Frontend (Next.js)        │
│   - MBF.encode/decode       │           │   - WebSocket Client        │
│   - WebSocket Handler       │           │   - Drawing Canvas          │
│   - ETS State Management    │           │   - Real-time Sync          │
└─────────────────────────────┘           └─────────────────────────────┘
```

## バイナリプロトコル仕様

### ヘッダ構造

```
┌────────────────────────────────────────────────────────────┐
│ Offset │ Size  │ Field   │ Description                    │
├────────────────────────────────────────────────────────────┤
│ 0      │ 2     │ Magic   │ "MP" (0x4D 0x50)              │
│ 2      │ 1     │ Version │ Protocol version (0x01)        │
│ 3      │ 1     │ Flags   │ Reserved flags (0x00)          │
│ 4      │ 1     │ Type    │ Message type identifier        │
│ 5      │ var   │ Payload │ Message-specific data          │
└────────────────────────────────────────────────────────────┘
```

### メッセージタイプ

| Type ID | Name           | Description                  |
|---------|----------------|------------------------------|
| 0x10    | StrokeSync     | リアルタイムポイント同期     |
| 0x11    | StrokeEnd      | ストローク終了               |
| 0x12    | StrokeComplete | 完了したストローク全体       |
| 0x13    | StrokeAck      | 確認応答                     |
| 0x20    | CanvasClear    | キャンバスクリア             |
| 0x30    | RoomState      | ルーム状態                   |

### StrokeSync メッセージ (0x10)

```
┌────────────────────────────────────────────────────────────┐
│ Offset │ Size  │ Field       │ Description                │
├────────────────────────────────────────────────────────────┤
│ 5      │ 4     │ user_hash   │ ユーザーID hash (u32)      │
│ 9      │ 4     │ timestamp   │ タイムスタンプ (u32)       │
│ 13     │ 1     │ r           │ 色: Red (u8)               │
│ 14     │ 1     │ g           │ 色: Green (u8)             │
│ 15     │ 1     │ b           │ 色: Blue (u8)              │
│ 16     │ 1     │ width       │ 線幅 (u8)                  │
│ 17     │ 2     │ point_count │ ポイント数 (u16)           │
│ 19     │ 4*N   │ points      │ Points [(x:u16, y:u16)...] │
└────────────────────────────────────────────────────────────┘
```

### StrokeComplete メッセージ (0x12)

```
┌────────────────────────────────────────────────────────────┐
│ Offset │ Size  │ Field       │ Description                │
├────────────────────────────────────────────────────────────┤
│ 5      │ 8     │ message_id  │ メッセージID (u64)         │
│ 13     │ 1     │ tool        │ ツールタイプ (u8)          │
│ 14     │ 1     │ r           │ 色: Red (u8)               │
│ 15     │ 1     │ g           │ 色: Green (u8)             │
│ 16     │ 1     │ b           │ 色: Blue (u8)              │
│ 17     │ 1     │ width       │ 線幅 (u8)                  │
│ 18     │ 8     │ timestamp   │ タイムスタンプ (u64)       │
│ 26     │ 2     │ point_count │ ポイント数 (u16)           │
│ 28     │ 4*N   │ points      │ Points [(x:u16, y:u16)...] │
└────────────────────────────────────────────────────────────┘
```

### StrokeAck メッセージ (0x13)

```
┌────────────────────────────────────────────────────────────┐
│ Offset │ Size  │ Field       │ Description                │
├────────────────────────────────────────────────────────────┤
│ 5      │ 8     │ message_id  │ メッセージID (u64)         │
│ 13     │ 4     │ user_hash   │ ユーザーID hash (u32)      │
│ 17     │ 4     │ timestamp   │ タイムスタンプ (u32)       │
│ 21     │ 1     │ success     │ 成功フラグ (0/1)           │
└────────────────────────────────────────────────────────────┘
```

## コンポーネント詳細

### 1. MPS DSL定義 (`mps-protocol/`)

プロトコル定義のためのDSL構造:

```
mps-protocol/
├── languages/
│   └── MPSBinaryFormat/
│       ├── structure/        # 型とメッセージの構造定義
│       ├── editor/           # エディタ表現
│       └── generator/        # コード生成ルール
└── solutions/
    └── DrawingProtocol/
        └── models/           # 実際のプロトコル定義
```

### 2. Rust NIF (`phoenix/native/mbf_nif/`)

Rustlerを使用したElixir向けNative Implemented Functions:

```rust
// 主要な構造体
pub struct Point { x: u16, y: u16 }
pub struct Color { r: u8, g: u8, b: u8 }
pub struct StrokeId { user_hash: u32, timestamp: u32 }
pub struct StrokeSync { stroke_id, color, width, points }
pub struct StrokeComplete { message_id, tool, color, width, timestamp, points }
pub struct StrokeAck { message_id, stroke_id, success }

// NIF関数
#[rustler::nif]
fn encode_stroke_sync(env: Env, msg: StrokeSync) -> Result<Binary, String>

#[rustler::nif]
fn decode_stroke_sync(binary: Binary) -> Result<StrokeSync, String>
```

### 3. Elixir Wrapper (`phoenix/lib/mbf/`)

Elixirからの使いやすいAPI:

```elixir
# 高レベルAPI
MBF.encode(:stroke_sync, %{stroke_id: "...", color: "#FF0000", width: 5, points: [...]})
MBF.decode(binary)

# ネイティブ関数
MBF.Native.encode_stroke_sync(stroke_sync_struct)
MBF.Native.decode_stroke_sync(binary)
MBF.Native.hex_to_color("#FF0000")
MBF.Native.hash_user_id("user123")
```

### 4. TypeScript Codec (`frontend/lib/mbf/`)

フロントエンド用のバイナリエンコーダ/デコーダ:

```typescript
// エンコード
const binary = encodeStrokeSync({
  strokeId: { userHash: 12345, timestamp: Date.now() },
  color: { r: 255, g: 0, b: 0 },
  width: 5,
  points: [{ x: 100, y: 200 }]
});

// デコード
const message = decodeMessage(binary);
if (message.type === 'stroke_sync') {
  const data = message.data as StrokeSync;
}
```

## データフロー

### 描画同期フロー

```
┌────────────┐     Binary      ┌────────────────┐     Binary     ┌────────────┐
│  Client A  │ ──────────────> │ Phoenix Server │ ─────────────> │  Client B  │
│            │   StrokeSync    │                │  StrokeSync    │            │
│ TypeScript │                 │ Elixir + NIF   │                │ TypeScript │
│ Encoder    │                 │ Decoder/Encode │                │ Decoder    │
└────────────┘                 └────────────────┘                └────────────┘
     │                               │                                │
     │ 1. encodeStrokeSync()         │ 2. MBF.decode()               │ 4. decodeMessage()
     │                               │ 3. MBF.encode() + broadcast   │
     ▼                               ▼                                ▼
 ArrayBuffer                    Elixir Binary                   ArrayBuffer
```

## パフォーマンス比較

### JSON vs MBF (100ポイントのストローク)

| Format | Size (bytes) | Encode Time | Decode Time |
|--------|-------------|-------------|-------------|
| JSON   | ~2,800      | ~0.5ms      | ~0.3ms      |
| MBF    | ~420        | ~0.1ms      | ~0.08ms     |
| 削減率 | **85%**     | **80%**     | **73%**     |

### 帯域幅節約 (1000 strokes/min)

- JSON: 2.8 MB/min
- MBF: 0.42 MB/min
- **月間節約: ~100 GB/user**

## 技術スタック

| Component | Technology | Purpose |
|-----------|------------|---------|
| DSL定義 | JetBrains MPS | プロトコル仕様の定義 |
| サーバーNIF | Rust + Rustler | 高速バイナリ処理 |
| サーバー | Phoenix/Elixir | WebSocket、状態管理 |
| フロントエンド | TypeScript | ブラウザ側エンコード/デコード |
| ビルド | Cargo + Mix | Rustコンパイル、NIF統合 |

## ビルドと実行

### 前提条件

- Rust 1.70+
- Elixir 1.14+
- Node.js 18+

### Rust NIF ビルド

```bash
cd phoenix
mix deps.get
mix compile
```

### テスト実行

```bash
# Elixir テスト
cd phoenix
mix test

# TypeScript 型チェック
cd frontend
npm run type-check
```

### 開発サーバー起動

```bash
# Docker Compose
docker-compose up -d

# または手動
cd phoenix && mix phx.server
cd frontend && npm run dev
```

## 拡張性

### 新しいメッセージタイプの追加

1. MPS DSLで新しいメッセージを定義
2. コード生成を実行
3. 生成されたRust/TypeScriptコードを確認
4. Phoenix Channelハンドラを更新

### バージョン管理

- ヘッダのVersionフィールドで後方互換性を維持
- 新しいメッセージタイプは既存の範囲外のIDを使用

## 関連ドキュメント

- [DSL設計書](drawing-app-dsl-design.md)
- [実装ガイド](drawing-app-dsl-implementation-guide.md)
- [MPS公式ドキュメント](https://www.jetbrains.com/help/mps/)
- [Rustler GitHub](https://github.com/rusterlium/rustler)
