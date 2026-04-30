#!/bin/bash

# BostanHub Otomatik Deploy Scripti
# Bu dosya sunucuda calistirildiginda projeyi gunceller ve baslatir.

echo "------------------------------------------------"
echo "🚀 Bostan Market Canliya Alma Islemi Basliyor..."
echo "------------------------------------------------"

# ADIM 1: Kodlari Guncelle
echo "📦 ADIM 1: Github'dan en guncel kodlar cekiliyor..."
git pull origin main
if [ $? -eq 0 ]; then
    echo "✅ Kodlar basariyla güncellendi."
else
    echo "❌ HATA: Git pull basarisiz oldu!"
    exit 1
fi

# ADIM 2: Frontend Hazirlik
echo "🎨 ADIM 2: Frontend bagimliliklari yukleniyor ve derleniyor..."
npm install
npm run build
echo "✅ Frontend hazir."

# ADIM 3: Backend Hazirlik
echo "⚙️ ADIM 3: Backend yapilandiriliyor..."
cd backend
npm install
# Veritabanini guncelle/hazirla
node init_db.js
node seed.js
echo "✅ Backend ve Veritabani hazir."

# ADIM 4: Servisleri Yeniden Baslat
echo "🔄 ADIM 4: Uygulama servisleri yeniden baslatiliyor (PM2)..."
# Not: PM2 kurulu olmalidir
pm2 restart all || pm2 start server.js --name "manav-api"
cd ..

echo "------------------------------------------------"
echo "🎉 TEBRIKLER! Uygulama Basariyla Deploy Edildi."
echo "🌐 Su an canlida yayindasiniz."
echo "------------------------------------------------"
