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

// 📂 Lister les fichiers PDF déjà scannés
app.get("/list-pdfs", (req, res) => {
  fs.readdir(folder, (err, files) => {
    if (err) return res.status(500).json({ error: "Erreur lecture dossier" });
    const pdfs = files.filter((f) => f.endsWith(".pdf"));
    res.json(pdfs);
  });
});

// 🗑️ Supprimer un PDF spécifique
app.post("/delete-pdf", (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(folder, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log("🗑️ Supprimé :", filename);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Fichier non trouvé" });
  }
});

// Sert les fichiers PDF pour téléchargement
app.use("/docs", express.static(folder));

app.listen(3000, () => console.log("🚀 Serveur sur http://localhost:3000"));
