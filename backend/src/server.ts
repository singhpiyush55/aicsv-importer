// This is the starting point of our backend server.
// It sets up Express, adds a couple of standard middlewares, wires up
// our routes, and starts listening for requests.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import importRoutes from "./routes/importRoutes";

// Load variables from the .env file into process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allow our frontend's domain to call this API.
// In development this is usually http://localhost:3000
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

// Parse incoming JSON bodies (not strictly needed for file upload,
// but useful to have for any small JSON requests).
app.use(express.json());

// A simple health check endpoint - useful to confirm the server is
// running, especially after deploying it somewhere like Render or Railway.
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "GrowEasy CSV Importer backend is running." });
});

// All of our real API routes live under /api
app.use("/api", importRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
