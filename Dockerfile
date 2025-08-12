# Node.js 公式イメージを使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションのソースコードをコピー
COPY . .

# Next.js アプリケーションをビルド
RUN npm run build

# アプリケーションを起動するユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 適切な権限を設定
RUN chown -R nextjs:nodejs /app
USER nextjs

# ポート3000を公開
EXPOSE 3000

# 環境変数を設定
ENV NODE_ENV=production
ENV PORT=3000

# アプリケーションを起動
CMD ["npm", "start"]