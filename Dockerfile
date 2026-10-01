FROM node:22-slim
WORKDIR /app
# Сначала только package*.json: слой с node_modules кэшируется, пока не меняются зависимости
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
# --host 0.0.0.0: dev-сервер Vite доступен снаружи контейнера, а не только внутри него
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
