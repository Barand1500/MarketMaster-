# BostanHub - Modern Greengrocer Management & Customer Portal
### Modern Manav Yönetim ve Müşteri Portalı

**BostanHub** is a comprehensive management platform designed for local businesses, specifically greengrocers and fresh food vendors, combining both administrative and customer-facing interfaces.
**BostanHub**, yerel işletmeler (özellikle manavlar ve taze gıda satıcıları) için geliştirilmiş, hem yönetici hem de müşteri tarafını birleştiren kapsamlı bir yönetim platformudur.

---

## 📸 Screenshots / Ekran Görüntüleri

![Dashboard Preview](https://via.placeholder.com/800x450?text=BostanHub+Dashboard+Preview)
*Main Dashboard and Customer Portal Interface*

---

## ✨ Features / Özellikler

### 🛡️ Admin Dashboard / Yönetici Paneli
*   **Excel-Style Management:** Update products, prices, and stocks rapidly on a grid layout.
*   **Excel Tarzı Hızlı Yönetim:** Ürünleri, fiyatları ve stokları tablo üzerinde anında güncelleyin.
*   **Staff Permissions:** Assign specific page access (Products, Customers, etc.) to staff members.
*   **Personel Yetkilendirme:** Ekip üyelerine sayfa bazlı erişim yetkileri tanımlayın.
*   **Strict Validation:** Prevents duplicate Email, Phone, or Tax ID entries.
*   **Gelişmiş Doğrulama:** Mükerrer E-posta, Telefon veya TC/VKN kaydını engelleyen akıllı sistem.
*   **Help Modules:** Interactive "How to Use" guide accessible via **F1** hotkey.
*   **F1 Yardım Kısayolu:** Her sayfada F1 tuşu ile açılan interaktif kullanım rehberi.

### 👤 Customer Portal / Müşteri Portalı
*   **Dynamic Pricing:** Customers see their specifically assigned discounted prices in real-time.
*   **Dinamik Fiyatlandırma:** Müşteriler kendilerine özel indirimli fiyatları anlık olarak görür.
*   **Flexible Login:** Login via Name, Email, Phone, or Tax ID.
*   **Esnek Giriş:** Ad-Soyad, E-posta, Telefon veya TC/VKN ile giriş yapabilme.
*   **Profile Security:** Customers can manage billing info and change passwords with strict verification.
*   **Profil Güvenliği:** Fatura bilgileri yönetimi ve doğrulamalı güvenli şifre değiştirme.

---

## 🚀 Tech Stack / Kullanılan Teknolojiler

*   **React (v18):** Core framework using Hooks (useState, useEffect, useMemo) and Context API for global state management.
*   **React (v18):** Hooks ve Context API ile güçlendirilmiş ana framework.
*   **Vite:** Ultra-fast build tool and development server.
*   **Vite:** Ultra hızlı derleme ve geliştirme sunucusu.
*   **Vanilla CSS:** Custom design system with modern variables, flexbox/grid layouts, and premium animations (No heavy UI libraries).
*   **Vanilla CSS:** Modern değişkenler ve özel animasyonlarla sıfırdan tasarlanmış premium arayüz.
*   **LocalStorage:** Efficient data persistence for demo environments, structured to be easily replaced by a REST API.
*   **LocalStorage:** Veri sürekliliği için optimize edilmiş yerel depolama mimarisi.

---

## 🛠️ Installation & Setup / Kurulum ve Yapılandırma

### Prerequisites / Gereksinimler
*   Node.js (v16 or higher / v16 ve üzeri)
*   npm or yarn

### Steps / Adımlar

1.  **Clone the project / Projeyi klonlayın:**
    ```bash
    git clone https://github.com/yourusername/bostanhub.git
    cd bostanhub
    ```

2.  **Install dependencies / Bağımlılıkları yükleyin:**
    This will install all necessary packages including React and Vite.
    Bu komut React, Vite ve gerekli tüm paketleri yükleyecektir.
    ```bash
    npm install
    ```

3.  **Run Development Server / Geliştirme Sunucusunu Başlatın:**
    Launch the app in development mode with Hot Module Replacement (HMR).
    Uygulamayı anlık güncelleme desteği ile geliştirme modunda başlatın.
    ```bash
    npm run dev
    ```

4.  **Build for Production / Canlı Sürüm İçin Derleme:**
    Generate a highly optimized production bundle in the `dist` folder.
    `dist` klasöründe optimize edilmiş canlı sürüm çıktılarını oluşturun.
    ```bash
    npm run build
    ```

---

## 💡 Usage Notes / Kullanım Notları

*   **Default Admin Credentials:** Use `ercan` / `123` to access the full management suite.
*   **Admin Girişi:** Tüm yetkilere erişmek için `ercan` / `123` bilgilerini kullanın.
*   **F1 Key:** Press **F1** anywhere to see specific instructions for that page.
*   **F1 Tuşu:** Herhangi bir sayfadayken o sayfanın yardım rehberini açmak için F1'e basın.

---
**BostanHub** - *Digitalizing fresh food commerce. / Taze gıda ticaretini dijitalleştirin.*
