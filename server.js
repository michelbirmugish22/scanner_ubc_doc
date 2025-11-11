import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));

const folder = path.resolve("doc_scannes");
if (!fs.existsSync(folder)) fs.mkdirSync(folder);

app.post("/upload-pdf", (req, res) => {
  const { pdfBase64, filename } = req.body;
  const buffer = Buffer.from(pdfBase64, "base64");
  const savePath = path.join(folder, filename);
  fs.writeFileSync(savePath, buffer);
  console.log("✅ PDF sauvegardé :", savePath);
  res.json({ success: true, file: filename });
});

app.use(express.static(".")); // sert index.html

app.listen(3000, () => console.log("🚀 Serveur sur http://localhost:3000"));
