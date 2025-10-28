// server.js

// 1. Impor Modul (Menggunakan sintaks ES Module)
import express from "express";
// import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js"; // Impor rute terpisah
import scrapingRoutes from "./routes/scrapingRoutes.js"; // Impor rute terpisah

// dotenv.config({ path: "./.env" });

// // 2. Muat Variabel Lingkungan
// dotenv.config();
console.log(process.env.PORT);
const PORT = process.env.PORT || 3000;

// 3. Inisialisasi Aplikasi Express
const app = express();

// 4. Middleware Global (Best Practices)

// Middleware untuk memproses data JSON dari request body
// Ini menggantikan body-parser untuk JSON
app.use(express.json());

// Middleware untuk memproses data dari form URL-encoded
app.use(express.urlencoded({ extended: true }));

// Middleware sederhana untuk logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 5. Rute Dasar
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Selamat datang di Express Modern API!",
    environment: process.env.NODE_ENV || "development",
  });
});

// 6. Rute Spesifik (Menggunakan Router)
// Semua rute di userRoutes akan di-prefix dengan '/api/users'
app.use("/api/users", userRoutes);
app.use("/api/scraping", scrapingRoutes);

// 7. Penanganan Rute 404 (Not Found)
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan." });
});

// 8. Penanganan Kesalahan Global (Error Handling Middleware)
// Ini adalah middleware dengan 4 parameter (err, req, res, next)
app.use((err, req, res, next) => {
  console.error(err.stack); // Log detail error ke konsol server
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || "Terjadi kesalahan internal server.",
    error: process.env.NODE_ENV === "production" ? {} : err.stack, // Tampilkan stack trace hanya saat development
  });
});

// 9. Menjalankan Server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
