# Node.js 公式イメージを使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール（ビルドに必要な開発依存関係も含む）
RUN npm ci

# アプリケーションのソースコードをコピー
COPY . .

# Next.js アプリケーションをビルド
RUN npm run build

# 本番用の依存関係のみを残す（TypeScriptは必要なので残す）
RUN npm prune --production && npm install typescript

# アプリケーションを起動するユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 適切な権限を設定
RUN chown -R nextjs:nodejs /app
USER nextjs

# ポート8888を公開
EXPOSE 8888

# 環境変数を設定
ENV NODE_ENV=production
ENV PORT=8888
ENV HOSTNAME=0.0.0.0

# アプリケーションを起動
CMD ["npm", "start"]