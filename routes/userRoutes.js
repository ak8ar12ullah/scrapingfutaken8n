// routes/userRoutes.js

import express from "express";
// Menggunakan Router dari Express untuk mendefinisikan rute
const router = express.Router();

// Data Dummy
let users = [
  { id: 1, name: "Adi", email: "adi@example.com" },
  { id: 2, name: "Bima", email: "bima@example.com" },
];

// Rute: GET /api/users
router.get("/", (req, res) => {
  res.status(200).json(users);
});

// Rute: POST /api/users
router.post("/", (req, res) => {
  const newUser = req.body;

  if (!newUser.name || !newUser.email) {
    // Menggunakan status 400 Bad Request
    return res.status(400).json({ message: "Nama dan email harus diisi." });
  }

  newUser.id = users.length + 1; // ID sementara
  users.push(newUser);

  // Menggunakan status 201 Created
  res.status(201).json({
    message: "User berhasil dibuat",
    user: newUser,
  });
});

// Rute: GET /api/users/:id (dengan parameter)
router.get("/:id", (req, res) => {
  // Mengambil parameter dari URL
  const userId = parseInt(req.params.id);
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res
      .status(404)
      .json({ message: `User dengan ID ${userId} tidak ditemukan.` });
  }

  res.status(200).json(user);
});

// Mengekspor router agar bisa digunakan di server.js
export default router;
