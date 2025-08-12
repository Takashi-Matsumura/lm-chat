# LM Chat

LM Studioと連携するAIチャットアプリケーション。教育的なメタデータ表示機能付きで、AI初心者の学習をサポートします。

## 特徴

- 🤖 **LM Studio との簡単な連携** - ローカルで実行されるAIモデルと直接通信
- 📊 **教育的メタデータ表示** - トークン数、応答時間、生成速度をリアルタイム表示
- 🎨 **トークン可視化** - テキストをトークン単位で色分け表示（学習用）
- 🌙 **ダーク/ライトモード** - 快適な視覚体験
- 🔧 **プロキシサーバー対応** - 企業ネットワーク環境での利用をサポート
- 🐳 **Docker完全対応** - コンテナ化による簡単なデプロイ
- 🧠 **Thinkingモード対応** - GPT-OSS などのリーズニングモデルの思考過程を表示
- 📱 **レスポンシブデザイン** - デスクトップ・タブレット・スマートフォン対応
- ⚡ **ストリーミング対応** - リアルタイムでAIの応答を表示

## クイックスタート

### 前提条件

1. **LM Studio** がインストール済みであること
2. **Node.js 18+** がインストール済みであること  
3. LM Studio でモデルがロード済みであること

### 通常の起動（ローカル開発）

```bash
# リポジトリをクローン
git clone <repository-url>
cd lm-chat

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3000 を開く
```

**初回設定:**
1. LM Studio を起動し、任意のモデルをロード
2. ブラウザで設定画面（右下の⚙️ボタン）を開く
3. LM Studio URL が正しいことを確認（通常は `http://localhost:1234/v1`）
4. 「接続テスト」をクリックして接続を確認

### Docker での起動

#### 本番環境用

```bash
# イメージをビルドして起動
docker-compose up -d

# ログを確認
docker-compose logs -f

# 停止
docker-compose down
```

#### 開発環境用（ホットリロード対応）

```bash
# 開発用コンテナを起動
docker-compose --profile dev up lm-chat-dev

# またはバックグラウンドで起動
docker-compose --profile dev up -d lm-chat-dev
```

#### 手動ビルド

```bash
# Dockerイメージをビルド
docker build -t lm-chat .

# コンテナを起動
docker run -p 3000:3000 \
  -e LM_STUDIO_URL=http://host.docker.internal:1234/v1 \
  lm-chat
```

## プロキシ設定（企業ネットワーク対応）

社内LAN環境でプロキシサーバーを使用する場合の設定方法：

### 🔧 Web UI での設定（推奨）

1. アプリケーションを起動し、右下の⚙️ボタンをクリック
2. 「プロキシ設定（社内LAN環境用）」セクションを開く
3. 以下の項目を設定：

| 項目 | 設定例 | 説明 |
|------|---------|------|
| プロキシサーバーを使用する | ✅ | プロキシの有効化 |
| プロキシホスト | `proxy.company.com` | 社内プロキシサーバーのホスト名 |
| ポート | `8080` | プロキシサーバーのポート番号 |
| ユーザー名 | `your-username` | プロキシ認証用（オプション） |
| パスワード | `your-password` | プロキシ認証用（オプション） |

4. 「プロキシをテスト」ボタンで接続確認
5. 「設定を保存」で設定を保存

### 🐳 Docker環境での設定

#### 方法1: docker-compose.yml での設定

```yaml
# docker-compose.yml を編集
services:
  lm-chat:
    build: .
    ports:
      - "3000:3000"
    environment:
      - LM_STUDIO_URL=http://host.docker.internal:1234/v1
      - HTTP_PROXY=http://proxy.company.com:8080
      - HTTPS_PROXY=http://proxy.company.com:8080
      - NO_PROXY=localhost,127.0.0.1,host.docker.internal
```

#### 方法2: 環境変数での設定

```bash
# 環境変数を設定してから起動
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,host.docker.internal

docker-compose up -d
```

### 📡 LM Studio URL の設定

| 環境 | 推奨URL | 説明 |
|------|---------|------|
| **ローカル環境** | `http://localhost:1234/v1` | 標準設定 |
| **Docker環境** | `http://host.docker.internal:1234/v1` | コンテナからホストへのアクセス |
| **WSL2環境** | `http://host.docker.internal:1234/v1` | Windows WSL2での推奨設定 |

## 設定項目

### LM Studio サーバー設定

- **サーバーURL**: LM Studio APIのエンドポイント
- **接続テスト**: 設定したURLで接続確認

### プロキシ設定

- **プロキシサーバーを使用する**: プロキシの有効/無効
- **プロキシホスト**: プロキシサーバーのホスト名/IP
- **ポート**: プロキシサーバーのポート番号
- **ユーザー名・パスワード**: プロキシ認証（オプション）

### LLMパラメータ

- **Temperature**: 創造性のレベル（0.1-1.0）
- **最大トークン数**: 回答の最大長（500-4000）

## トラブルシューティング

### 🚫 LM Studio に接続できない

**症状**: 「LM Studio サーバーに接続できません」エラー

**解決手順**:
1. **LM Studio の起動確認**
   - LM Studio アプリが起動していることを確認
   - 左サイドバーの「Local Server」タブを開く
   - 「Start Server」ボタンを押してサーバーを起動

2. **モデルロード確認**
   - LM Studio でモデルがロードされていることを確認
   - チャット画面でモデルを選択

3. **URL設定確認**
   - ローカル環境: `http://localhost:1234/v1`
   - Docker環境: `http://host.docker.internal:1234/v1`
   - カスタムポート使用時: ポート番号を確認

4. **ファイアウォール確認**
   - ローカルファイアウォールがポート1234をブロックしていないか確認

### 🌐 プロキシ接続エラー

**症状**: プロキシテストが失敗する

**解決手順**:
1. **プロキシ設定確認**
   ```bash
   # 企業ネットワーク管理者に確認すべき項目
   - プロキシホスト名/IP
   - プロキシポート番号
   - 認証の要不要
   - 除外URL設定
   ```

2. **接続テスト**
   - ブラウザから `http://プロキシホスト:ポート` でアクセス可能か確認
   - curl コマンドでのテスト:
   ```bash
   curl -x http://proxy.company.com:8080 http://httpbin.org/ip
   ```

3. **認証設定**
   - ユーザー名・パスワードが必要な場合は正しく入力
   - ドメイン認証の場合: `DOMAIN\username` 形式で入力

### 🐳 Docker関連のエラー

**症状**: `Module not found: Can't resolve 'https-proxy-agent'`

**解決手順**:
```bash
# 依存関係を再インストール
npm install

# Next.js キャッシュをクリア
rm -rf .next

# 開発サーバーを再起動
npm run dev
```

**症状**: Docker コンテナが起動しない

**解決手順**:
1. **ポート競合確認**
   ```bash
   # ポート3000の使用状況確認
   lsof -i :3000
   
   # 競合している場合は別ポートを使用
   docker run -p 3001:3000 lm-chat
   ```

2. **ログ確認**
   ```bash
   # エラーログを確認
   docker-compose logs -f
   
   # 特定のサービスのログ
   docker-compose logs lm-chat
   ```

3. **Docker環境のクリーンアップ**
   ```bash
   # 全てのコンテナを停止・削除
   docker-compose down
   
   # イメージを再ビルド
   docker-compose build --no-cache
   
   # 再起動
   docker-compose up -d
   ```

### 📱 その他の問題

**症状**: ダークモードで文字が見えない

**解決**: 最新版にアップデートしてください。ダークモードの色設定が改善されています。

**症状**: トークン数が正しく表示されない

**解決**: ブラウザのローカルストレージをクリアして、アプリケーションを再読み込みしてください。

**症状**: ページが正しく表示されない

**解決**: 
```bash
# キャッシュクリア
rm -rf .next
npm run dev
```

## 🛠️ 開発情報

### 技術スタック

| カテゴリ | 技術・ライブラリ | バージョン | 用途 |
|----------|------------------|------------|------|
| **フロントエンド** | Next.js | 15.4.6 | React フレームワーク |
| | React | 19.1.0 | UI ライブラリ |
| | TailwindCSS | v4 | スタイリング |
| | React Icons | ^5.5.0 | アイコン |
| **Markdown** | react-markdown | ^10.1.0 | Markdown レンダリング |
| | remark-gfm | ^4.0.1 | GitHub Flavored Markdown |
| **AI接続** | OpenAI SDK | ^5.12.2 | LM Studio 互換 API |
| **プロキシ** | http-proxy-agent | ^7.0.0 | HTTP プロキシサポート |
| | https-proxy-agent | ^7.0.2 | HTTPS プロキシサポート |
| **開発** | TypeScript | ^5 | 型安全性 |
| | ESLint | ^9 | コード品質 |

### ディレクトリ構造

```
/app
├── /api                    # Next.js API Routes
│   ├── /chat              # チャット機能 (SSE対応)
│   ├── /models            # モデル一覧取得 (プロキシ対応)
│   └── /proxy-test        # プロキシ接続テスト
├── /contexts              # React Context
│   └── ThemeContext.tsx   # ダーク/ライトモード管理
├── /settings              # 設定画面
│   └── page.tsx          # LM Studio・プロキシ設定
├── globals.css            # グローバルスタイル
├── layout.tsx            # アプリケーションレイアウト
└── page.tsx              # メインチャット画面

/docker
├── Dockerfile            # 本番用コンテナ設定
├── docker-compose.yml    # Docker Compose 設定
└── .dockerignore        # Docker ビルド除外設定

package.json              # 依存関係とスクリプト
README.md                 # このドキュメント
```

### 開発時のポイント

- **API Routes**: `runtime = 'nodejs'` でプロキシエージェント対応
- **SSE (Server-Sent Events)**: リアルタイムストリーミングレスポンス
- **TypeScript**: 厳格な型チェックで開発効率向上
- **TailwindCSS v4**: 最新のCSS-in-JS アプローチ
- **Docker**: 本番・開発環境の両方に対応

### 機能的特徴

- **教育的メタデータ**: トークン数、応答時間、生成速度を表示
- **トークン可視化**: テキストを色分けして表示
- **Thinking モード**: GPT-OSS等のリーズニングモデル対応
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応
- **プロキシサポート**: 企業ネットワーク環境での利用

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

## 📞 サポート

問題が発生した場合は、GitHub Issues でお知らせください。
