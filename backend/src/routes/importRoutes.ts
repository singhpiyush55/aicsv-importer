// This file just defines the URL path for our one API endpoint,
// and connects it to multer (for handling the uploaded file) and
// our controller (which does the real work).

import { Router } from "express";
import multer from "multer";
import { handleCsvImport } from "../controllers/importController";

const router = Router();

// We keep the uploaded file in memory (as a Buffer) instead of saving
// it to disk, since we only need it briefly to read its text content.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max file size
});

// POST /api/import
// Expects a multipart/form-data request with a field named "file".
router.post("/import", upload.single("file"), handleCsvImport);

export default router;
