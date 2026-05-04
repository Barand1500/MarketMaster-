#!/bin/bash
# Sunucuda çalıştır: bash deploy.sh
# Yapılan değişiklikleri git'e push ettikten sonra sunucuda bu scripti çalıştır.

set -e

PROJECT_DIR="/home/guzelteknoloji-bostan/htdocs/bostan.guzelteknoloji.com"
BACKEND_NAME="manav-backend"

echo "===== Bostan Manav Deploy ====="

cd $PROJECT_DIR

echo "[1/4] Git'ten son versiyon çekiliyor..."
git pull origin main

echo "[2/4] Frontend bağımlılıkları yükleniyor ve build alınıyor..."
npm install
npm run build
# Build çıktısı otomatik olarak frontend/ klasörüne gider

echo "[3/4] Backend bağımlılıkları yükleniyor..."
cd backend
npm install --omit=dev
cd ..

echo "[4/4] Backend yeniden başlatılıyor..."
pm2 restart $BACKEND_NAME || pm2 start backend/server.js --name $BACKEND_NAME

echo ""
echo "===== Deploy tamamlandı! ====="
pm2 status $BACKEND_NAME
