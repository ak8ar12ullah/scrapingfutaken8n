// routes/userRoutes.js

import express from "express";
import { scrapeSocialMedia } from "../socialScraper_final.js";
import { mapsScraper } from "../mapsScraper_final.js";
// Menggunakan Router dari Express untuk mendefinisikan rute
const router = express.Router();

// Rute: POST /api/users
router.get("/website", async (req, res) => {
  let url;
  try {
    url = JSON.parse(req.body).url;
  } catch (error) {
    url = req.body.url;
  }
  console.log(url);
  const datas = await scrapeSocialMedia(url);
  console.log(datas);

  //   if (!newUser.name || !newUser.email) {
  //     // Menggunakan status 400 Bad Request
  //     return res.status(400).json({ message: "Nama dan email harus diisi." });
  //   }

  //   newUser.id = users.length + 1; // ID sementara
  //   users.push(newUser);

  // Menggunakan status 201 Created
  res.status(201).json({
    message: url + " berhasil di scraping",
    user: datas,
  });
});
router.get("/maps", async (req, res) => {
  let url;
  try {
    url = JSON.parse(req.body).url;
  } catch (error) {
    url = req.body.url;
  }
  console.log(url);
  const datas = await mapsScraper(url);
  console.log(datas);

  //   if (!newUser.name || !newUser.email) {
  //     // Menggunakan status 400 Bad Request
  //     return res.status(400).json({ message: "Nama dan email harus diisi." });
  //   }

  //   newUser.id = users.length + 1; // ID sementara
  //   users.push(newUser);

  // Menggunakan status 201 Created
  res.status(201).json({
    message: url + " berhasil di scraping",
    user: datas,
  });
});

// Mengekspor router agar bisa digunakan di server.js
export default router;
