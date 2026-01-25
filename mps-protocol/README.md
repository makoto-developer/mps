# MBF Protocol - JetBrains MPS Implementation

MPS (MPS Binary Format) プロトコルを JetBrains MPS で定義し、複数のターゲット言語に対してコードを生成します。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    JetBrains MPS DSL                         │
│                 (protocol.mbf definition)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │   Rust    │   │TypeScript │   │  Elixir   │
    │Generator  │   │ Generator │   │ Generator │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  lib.rs   │   │mbf-codec  │   │  mbf.ex   │
    │  (NIF)    │   │   .ts     │   │ types.ex  │
    └───────────┘   └───────────┘   └───────────┘
```

## ディレクトリ構造

```
mps-protocol/
├── languages/MBF/           # MPS 言語定義
│   ├── MBF.mpl              # 言語メタデータ
│   ├── models/
│   │   └── structure.mps    # AST ノード定義
│   └── generator/
│       ├── rust/            # Rust コード生成
│       ├── typescript/      # TypeScript コード生成
│       └── elixir/          # Elixir コード生成
│
└── solutions/mps_protocol/
    └── models/
        └── protocol.mbf     # プロトコル定義
```

## プロトコル定義 DSL

```
protocol MBF {
  magic = "MP"
  version = 1

  type Point {
    x: u16
    y: u16
  }

  message StrokeSync = 0x10 {
    stroke_id: StrokeId
    color: Color
    width: u8
    points: Point[]
  }
}
```

## 生成されるコード

### Rust (NIF)

```rust
#[derive(Debug, Clone, NifStruct)]
#[module = "MBF.StrokeSync"]
pub struct StrokeSync {
    pub stroke_id: StrokeId,
    pub color: Color,
    pub width: u8,
    pub points: Vec<Point>,
}

#[rustler::nif]
fn encode_stroke_sync(msg: StrokeSync) -> Result<Binary<'static>, String> {
    // Generated encoding logic
}
```

### TypeScript

```typescript
export interface StrokeSyncMessage {
  type: MBFMessageType.STROKE_SYNC;
  strokeId: StrokeId;
  color: Color;
  width: number;
  points: Point[];
}

export function encodeStrokeSync(msg: Omit<StrokeSyncMessage, 'type'>): ArrayBuffer {
  // Generated encoding logic
}
```

### Elixir

```elixir
defmodule MBF.StrokeSync do
  defstruct [:stroke_id, :color, :width, :points]

  @type t :: %__MODULE__{
    stroke_id: MBF.StrokeId.t(),
    color: MBF.Color.t(),
    width: non_neg_integer(),
    points: list(MBF.Point.t())
  }
end
```

## バイナリフォーマット

```
| Magic (2) | Version (1) | Flags (1) | Type (1) | Payload (variable) |
| 0x4D 0x50 |    0x01     |   0x00    |   0x10   |        ...         |
```

### メッセージタイプ

| タイプ | ID | 説明 |
|--------|-----|------|
| StrokeSync | 0x10 | リアルタイム描画同期 |
| StrokeEnd | 0x11 | 描画終了 |
| StrokeComplete | 0x12 | 完了したストローク |
| StrokeAck | 0x13 | 受信確認 |
| CanvasClear | 0x20 | キャンバスクリア |
| RoomState | 0x30 | ルーム状態 |

## 使用方法

### 1. MPS プロジェクトを開く

```bash
# JetBrains MPS をインストール
# mps-protocol ディレクトリをプロジェクトとして開く
```

### 2. プロトコル定義を編集

`solutions/mps_protocol/models/protocol.mbf` を MPS エディタで編集

### 3. コード生成

MPS のビルドを実行すると、以下のファイルが生成されます：

- `phoenix/native/mbf_nif/src/lib.rs`
- `frontend/lib/mbf/mbf-codec.ts`
- `phoenix/lib/mbf/*.ex`

## 現在の実装状況

### 実装済み

- [x] Rust NIF (手動実装) - `phoenix/native/mbf_nif/src/lib.rs`
- [x] TypeScript コーデック (手動実装) - `frontend/lib/mbf/mbf-codec.ts`
- [x] Elixir ラッパー (手動実装) - `phoenix/lib/mbf/*.ex`
- [x] MPS 言語構造定義 - `languages/MBF/models/structure.mps`
- [x] ジェネレータテンプレート - `languages/MBF/generator/*/`

### 今後の作業

- [ ] MPS エディタ定義
- [ ] MPS 型システム定義
- [ ] 完全なジェネレータロジック
- [ ] MPS ↔ 手動実装の同期

## パフォーマンス比較

| フォーマット | StrokeSync (100点) | 圧縮率 |
|-------------|-------------------|--------|
| JSON | ~1.2KB | - |
| MBF Binary | ~420B | -65% |
| MBF + gzip | ~180B | -85% |

## ライセンス

MIT License
