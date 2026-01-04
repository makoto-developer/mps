# Jetbrains MPS

## Description

このリポジトリはJetbrains MPSの検証リポジトリである。

MPSを使ってAIで色々作らせたり、制御する方法を見出したい。

## MPSとは

**MPS (Meta Programming System)** は、JetBrainsが開発したプロジェクション型エディタベースの言語ワークベンチです。

### 主な特徴

#### 1. プロジェクション型エディタ

- テキストベースではなく、AST（抽象構文木）を直接編集
- 文法エラーが構造的に発生しにくい
- 数式、図形、テーブルなど多様な表現が可能

#### 2. 言語指向プログラミング (LOP)

- DSL（ドメイン特化言語）の作成が容易
- 既存言語の拡張・組み合わせが可能
- ビジネスロジックをドメインの言葉で記述

#### 3. 言語構成要素

- **Structure**: 言語の文法定義（AST構造）
- **Editor**: 見た目の定義（プロジェクション）
- **Behavior**: 言語要素の振る舞い（メソッド）
- **Generator**: コード生成ルール（Java等への変換）
- **Type System**: 型チェックルール
- **Constraints**: 制約条件

### なぜMPSなのか

**従来のテキストベースエディタとの違い**:

| 項目 | テキストベースエディタ | MPS |
|------|----------------------|-----|
| 編集対象 | テキスト（文字列） | AST（抽象構文木） |
| 文法エラー | 入力時に発生 | 構造的に防止 |
| 表現力 | テキストのみ | 数式、図形、テーブル等 |
| DSL作成 | パーサー実装が必要 | GUIで定義可能 |
| コード補完 | 文字列ベース | 型情報ベース |

## Getting Started

### Prerequisites

- **JDK**: 11以上（推奨: JDK 17）
- **JetBrains MPS**: 2023.2以降を推奨
- **メモリ**: 最低4GB、推奨8GB以上

### Installation

#### 1. MPSのインストール

```bash
# 方法1: JetBrains Toolbox経由（推奨）
# https://www.jetbrains.com/toolbox-app/ からToolboxをインストール
# Toolbox内でMPSを検索してインストール

# 方法2: 公式サイトから直接ダウンロード
# https://www.jetbrains.com/mps/download/
```

#### 2. プロジェクトのクローン

```bash
git clone https://github.com/makoto-developer/mps.git
cd mps
```

#### 3. MPSでプロジェクトを開く

1. MPSを起動
2. `Open` → このリポジトリのディレクトリを選択
3. プロジェクトが読み込まれるまで待機

### 基本的な使い方

#### 新しい言語の作成

1. **New Language**
   - File → New → Language
   - Language名を入力（例: `com.example.mydsl`）

2. **Structure定義**
   - Structureノードを開く
   - Conceptを定義（言語の構文要素）

3. **Editor作成**
   - Editorノードを開く
   - Conceptの見た目を定義

4. **Generator設定**
   - Generatorノードを開く
   - 生成規則を定義（Java等へ変換）

5. **Build & Run**
   - Build → Make
   - 生成されたコードを実行

## プロジェクト構成

```
mps/
├── languages/          # 作成したDSL定義
│   └── [言語名]/
│       ├── structure/  # 文法定義
│       ├── editor/     # エディタ定義
│       ├── behavior/   # 振る舞い定義
│       ├── generator/  # コード生成規則
│       └── typesystem/ # 型システム
│
├── solutions/          # DSLを使用したソリューション
│   └── [ソリューション名]/
│       └── models/     # モデルファイル
│
└── build/             # 生成されたコード
```

## AI活用の実験

このリポジトリでは、MPSとAIを組み合わせた以下の実験を行います。

### 実験1: 言語定義の自動生成

**目的**: AIにドメイン知識を与えて、Structure/Editorを自動生成

**アプローチ**:
1. ドメイン専門家の説明をAIに入力
2. AIがConcept定義を提案
3. MPSでStructureを生成
4. Editorを自動生成

### 実験2: Generator規則の学習

**目的**: 入出力例からGenerator規則を自動生成

**アプローチ**:
1. DSL → 生成コード の対応例を収集
2. AIが変換パターンを学習
3. Generator規則を自動生成

### 実験3: インテリジェントなコード補完

**目的**: MPS AST + AI によるコンテキスト理解の高度な補完

**アプローチ**:
1. AST情報をAIに提供
2. コンテキストを理解した補完候補を生成
3. MPSの補完システムと統合

### 実験4: DSL設計支援

**目的**: ドメイン専門家との対話からDSL仕様を自動提案

**アプローチ**:
1. ドメイン専門家とAIが対話
2. 要件を整理
3. DSL設計案を自動生成
4. MPSで実装

## 参考資料

### 公式ドキュメント

- [JetBrains MPS公式サイト](https://www.jetbrains.com/mps/)
- [MPS User Guide](https://www.jetbrains.com/help/mps/)
- [MPS Platform Docs](https://www.jetbrains.com/help/mps/mps-platform.html)

### チュートリアル

- [Fast Track to MPS](https://www.jetbrains.com/help/mps/fast-track-to-mps.html)
- [MPS Tutorial](https://www.jetbrains.com/help/mps/mps-tutorial.html)
- [Creating a Simple Language](https://www.jetbrains.com/help/mps/creating-a-simple-language.html)

### コミュニティ

- [MPS Forum](https://mps-support.jetbrains.com/)
- [MPS Slack](https://jetbrains-mps.slack.com/)
- [GitHub - JetBrains MPS](https://github.com/JetBrains/MPS)

### 書籍

- "The MPS Language Workbench" - Markus Voelter
- "DSL Engineering" - Markus Voelter

### ビデオ

- [MPS YouTube Channel](https://www.youtube.com/c/JetBrainsMPS)
- [Language Engineering with MPS](https://www.youtube.com/playlist?list=PLQ176FUIyIUYAjYxUi22tIHGYfK0eRV6a)


