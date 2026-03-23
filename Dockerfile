FROM node:20-alpine
WORKDIR /app

# Instalar dependencias
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copiar backend y frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

EXPOSE 3000
CMD ["node", "backend/src/app.js"]