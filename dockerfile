# ------------------------------------
# DOCKERFILE UTAMA (Single Stage Build)
# Aplikasi Node.js/Express dengan Puppeteer & Chromium (diinstal via APT)
# ------------------------------------
# Menggunakan base image Node.js versi 20
FROM node:20

# Tetapkan direktori kerja di dalam container
WORKDIR /app

# 1. Salin file konfigurasi dependency
# Langkah ini memanfaatkan Docker cache jika dependency tidak berubah
COPY package.json package-lock.json ./

# 2. Instalasi Chromium dan dependensi sistem
# Kita menggunakan 'apt-get' untuk instalasi Chromium resmi dari Debian
# dan menambahkan dependensi headless browser yang diperlukan.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    chromium \
    # Dependensi dasar yang wajib ada untuk menjalankan Chromium dalam mode headless di Linux
    libnss3 libasound2 libatk-bridge2.0-0 libcups2 libgdk-pixbuf2.0-0 libnspr4 libxss1 libxtst6 \
    # Membersihkan cache apt-get untuk menghemat ruang
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 3. Instal dependensi Node.js
# Puppeteer tidak akan mengunduh browser karena kita akan set PUPPETEER_EXECUTABLE_PATH
RUN npm install

# 4. Salin semua file proyek yang tersisa (kode sumber)
COPY . .

# ------------------------------------
# KONFIGURASI RUNTIME (Environment Variables & Perintah Eksekusi)
# ------------------------------------

# Environment variables krusial untuk Puppeteer
# Wajib: Memberi tahu Puppeteer lokasi executable Chromium yang diinstal via apt-get
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# Wajib: Argumentasi untuk menjalankan Chromium dengan aman di lingkungan Docker/container
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox" 
ENV PORT=9007 
ENV NODE_ENV=production

# Ekspos Port yang digunakan Express
EXPOSE 9007

# Perintah default untuk menjalankan Express
# CMD menjalankan proses utama aplikasi (server Express)
# Jika server ini mati, container akan Exit
CMD [ "npm", "run", "start" ]
