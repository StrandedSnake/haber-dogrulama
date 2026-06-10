const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

const NGROK_API = "https://never-unbroken-upturned.ngrok-free.dev/fact-check";

app.post("/fact-check", async (req, res) => {
  try {
    console.log("Frontend'den gelen body:", req.body);

    const response = await axios.post(
      NGROK_API,
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("Proxy error:", err.response?.data || err.message);

    res.status(err.response?.status || 500).json({
      error: err.message,
      detail: err.response?.data || null,
    });
  }
});

app.listen(5000, () => {
  console.log("Proxy server running on http://localhost:5000");
});