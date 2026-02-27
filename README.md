# Claude Dialog

スマホブラウザ上で日本語音声入力→テキスト応答→音声読み上げの対話を実現するWebアプリ。

## 技術スタック

| 領域 | 技術 |
|---|---|
| Frontend | Vue.js 3 (Composition API) + Vite + TypeScript |
| Backend | NestJS + TypeScript |
| Infra | AWS CDK (TypeScript) |
| DB | DynamoDB シングルテーブル |
| 音声入力 | Web Speech API (SpeechRecognition, `ja-JP`) |
| 音声読み上げ | Web Speech API (SpeechSynthesis, `ja-JP`) |
| LLM | Claude API (Opus 4.6, SSE streaming) |

## ディレクトリ構成

```
claude-dialog/
├── package.json          # npm workspaces ルート
├── docker-compose.yml
├── .env.example
├── frontend/             # Vue.js 3 SPA
├── backend/              # NestJS API
└── infra/                # AWS CDK
```

## ローカル開発

### 前提条件

- Node.js 20+
- Docker (DynamoDB Local 用)
- Anthropic API Key

### セットアップ

```bash
# 依存関係インストール (モノレポ全体)
npm install

# 環境変数設定
cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY を設定
```

### 起動方法 A: 個別起動

```bash
# 1. DynamoDB Local 起動
docker run -d --name dynamodb-local -p 8000:8000 \
  amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -inMemory

# 2. テーブル作成
AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local \
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name claude-dialog \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# 3. Backend ビルド & 起動
cd backend
npx tsc -p tsconfig.build.json
DYNAMODB_ENDPOINT=http://localhost:8000 \
DYNAMODB_TABLE_NAME=claude-dialog \
AWS_REGION=ap-northeast-1 \
AWS_ACCESS_KEY_ID=local \
AWS_SECRET_ACCESS_KEY=local \
ANTHROPIC_API_KEY=<your-key> \
node dist/main.js

# 4. Frontend 起動 (別ターミナル)
npx -w frontend vite --port 3000
```

### 起動方法 B: Docker Compose

```bash
docker-compose up
```

### アクセス

| サービス | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| DynamoDB Admin | http://localhost:8001 |
| Swagger Docs | http://localhost:4000/api/docs |

## API エンドポイント

| Method | Path | 説明 |
|---|---|---|
| GET | `/api/health` | ヘルスチェック |
| GET | `/api/conversations` | 会話一覧 |
| POST | `/api/conversations` | 新規会話作成 |
| DELETE | `/api/conversations/:id` | 会話削除 |
| GET | `/api/conversations/:id/messages` | メッセージ一覧 |
| POST | `/api/conversations/:id/messages/stream` | メッセージ送信 + SSE ストリーミング応答 |

## デプロイ (AWS CDK)

```bash
# ビルド
npm run build:frontend
npm run build:backend

# デプロイ
cd infra
ANTHROPIC_API_KEY=<your-key> API_KEY=<your-api-key> npx cdk deploy
```

カスタムドメイン: `claude-dialog.homisoftware.net` (`cdk.json` で設定)
