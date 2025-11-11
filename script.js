const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const pagesContainer = document.getElementById("pages");
const downloadLink = document.getElementById("download");
let capturedPages = [];

// --- Éditeur modal ---
const modal = document.getElementById("editor-modal");
const editCanvas = document.getElementById("edit-canvas");
const editCtx = editCanvas.getContext("2d");
let currentEditIndex = null;
let currentRotation = 0;

// Démarrage de la caméra
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: "environment" } })
  .then((stream) => (video.srcObject = stream))
  .catch(() => alert("Impossible d'accéder à la caméra."));

// Capture d’image
document.getElementById("capture").addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL("image/jpeg", 1.0);
  capturedPages.push(imageData);
  afficherPages();
});

// Affichage miniatures
function afficherPages() {
  pagesContainer.innerHTML = "";
  capturedPages.forEach((img, i) => {
    const div = document.createElement("div");
    div.className = "page";
    div.innerHTML = `
      <img src="${img}" alt="Page ${i + 1}">
      <button class="edit-btn" onclick="editPage(${i})">✏️</button>
      <button class="delete-btn" onclick="deletePage(${i})">✕</button>
    `;
    pagesContainer.appendChild(div);
  });
}

function deletePage(i) {
  capturedPages.splice(i, 1);
  afficherPages();
}

// --- Édition d’une image ---
window.editPage = function (index) {
  modal.style.display = "flex";
  currentEditIndex = index;
  currentRotation = 0;

  const img = new Image();
  img.onload = () => {
    editCanvas.width = img.width;
    editCanvas.height = img.height;
    editCtx.drawImage(img, 0, 0);
  };
  img.src = capturedPages[index];
};

// Rotation
document
  .getElementById("rotate-left")
  .addEventListener("click", () => rotate(-90));
document
  .getElementById("rotate-right")
  .addEventListener("click", () => rotate(90));

function rotate(angle) {
  currentRotation = (currentRotation + angle) % 360;
  const temp = document.createElement("canvas");
  const tctx = temp.getContext("2d");
  temp.width = editCanvas.width;
  temp.height = editCanvas.height;
  tctx.drawImage(editCanvas, 0, 0);

  if (angle % 180 !== 0) {
    [editCanvas.width, editCanvas.height] = [
      editCanvas.height,
      editCanvas.width,
    ];
  }

  editCtx.save();
  editCtx.translate(editCanvas.width / 2, editCanvas.height / 2);
  editCtx.rotate((angle * Math.PI) / 180);
  editCtx.drawImage(temp, -temp.width / 2, -temp.height / 2);
  editCtx.restore();
}

// Amélioration auto (contraste + luminosité simple)
document.getElementById("enhance").addEventListener("click", () => {
  const imgData = editCtx.getImageData(
    0,
    0,
    editCanvas.width,
    editCanvas.height
  );
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] * 1.1 + 10); // R
    data[i + 1] = Math.min(255, data[i + 1] * 1.1 + 10); // G
    data[i + 2] = Math.min(255, data[i + 2] * 1.1 + 10); // B
  }
  editCtx.putImageData(imgData, 0, 0);
});

// Sauvegarde des modifications
document.getElementById("save-edit").addEventListener("click", () => {
  capturedPages[currentEditIndex] = editCanvas.toDataURL("image/jpeg", 1.0);
  modal.style.display = "none";
  afficherPages();
});

// Annuler
document.getElementById("cancel-edit").addEventListener("click", () => {
  modal.style.display = "none";
});

// Génération du PDF + envoi serveur
// Génération du PDF + envoi serveur
document.getElementById("generate").addEventListener("click", async () => {
  if (capturedPages.length === 0) return alert("Aucune page capturée !");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210; // mm
  const pageHeight = 297; // mm

  capturedPages.forEach((imgData, i) => {
    if (i > 0) pdf.addPage();

    const img = new Image();
    img.src = imgData;

    // On doit attendre que l'image soit chargée pour calculer les proportions
    img.onload = () => {
      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const displayWidth = imgWidth * ratio;
      const displayHeight = imgHeight * ratio;
      const x = (pageWidth - displayWidth) / 2;
      const y = (pageHeight - displayHeight) / 2;

      pdf.addImage(imgData, "JPEG", x, y, displayWidth, displayHeight);

      // Si c’est la dernière image, on prépare le lien et l’envoi serveur
      if (i === capturedPages.length - 1) {
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.style.display = "inline-block";

        // Envoi au serveur
        const reader = new FileReader();
        reader.onloadend = async function () {
          const base64 = reader.result.split(",")[1];
          await fetch("/upload-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pdfBase64: base64,
              filename: `scan_${Date.now()}.pdf`,
            }),
          });
          alert("PDF envoyé et sauvegardé sur le serveur !");
        };
        reader.readAsDataURL(blob);
      }
    };
  });
});
