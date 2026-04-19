const imageInput = document.getElementById("imageInput");
const dropzone = document.getElementById("dropzone");
const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const expiryTimer = document.getElementById("expiryTimer");
const statusPill = document.getElementById("statusPill");
const uploadPanel = document.getElementById("upload-panel");
const copyButton = document.getElementById("copyButton");
const durationOptions = Array.from(document.querySelectorAll(".duration-option"));

const UPLOAD_ENDPOINT = "/api/upload";
let countdownId = null;
let expiresAt = null;
let currentObjectUrl = "";
let currentPublicLink = "";
let selectedDurationHours = 3;

function formatSize(bytes) {
  if (!bytes) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function updateCountdown() {
  if (!expiresAt) {
    expiryTimer.textContent = "--:--:--";
    return;
  }

  const remaining = expiresAt - Date.now();
  expiryTimer.textContent = formatRemaining(remaining);

  if (remaining <= 0) {
    clearInterval(countdownId);
    countdownId = null;
    statusPill.textContent = "Expired";
    uploadPanel.classList.add("is-expired");
    copyButton.disabled = true;
    copyButton.textContent = "Expired";
    return;
  }

  statusPill.textContent = "Live";
  uploadPanel.classList.remove("is-expired");
  copyButton.disabled = false;
}

function startCountdown() {
  if (countdownId) {
    clearInterval(countdownId);
  }
  updateCountdown();
  countdownId = setInterval(updateCountdown, 1000);
}

function showPreview(src, name, size) {
  previewImage.src = src;
  previewImage.style.display = "block";
  previewPlaceholder.style.display = "none";
  fileSize.textContent = formatSize(size);
  statusPill.textContent = "Link Ready";
  startCountdown();
}

function setGeneratedLink(url) {
  currentPublicLink = url;
  fileName.textContent = url;
  fileName.title = url;
  copyButton.textContent = "Copy";
}

function revokeCurrentLink() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = "";
  }
}

async function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    statusPill.textContent = "Image Only";
    return;
  }

  statusPill.textContent = "Uploading";
  copyButton.disabled = true;
  copyButton.textContent = "...";
  revokeCurrentLink();
  currentObjectUrl = URL.createObjectURL(file);

  try {
    const formData = new FormData();
    formData.set("image", file);
    formData.set("expiresHours", String(selectedDurationHours));

    const response = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Upload failed.");
    }

    expiresAt = Date.parse(payload.expiresAt);
    setGeneratedLink(payload.url);
    showPreview(currentObjectUrl, file.name, payload.size || file.size);
  } catch (error) {
    expiresAt = null;
    currentPublicLink = "";
    fileName.textContent = error instanceof Error ? error.message : "Upload failed";
    fileName.title = "";
    fileSize.textContent = "0 MB";
    expiryTimer.textContent = "--:--:--";
    statusPill.textContent = "Error";
    copyButton.disabled = true;
    copyButton.textContent = "Copy";
  }
}

durationOptions.forEach((option) => {
  option.addEventListener("click", () => {
    selectedDurationHours = Number(option.dataset.durationHours) || 3;
    durationOptions.forEach((item) => item.classList.remove("is-selected"));
    option.classList.add("is-selected");
  });
});

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  handleFile(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-active");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-active");
  });
});

dropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  handleFile(file);
});

copyButton.addEventListener("click", async () => {
  if (!currentPublicLink || copyButton.disabled) {
    return;
  }

  try {
    await navigator.clipboard.writeText(currentPublicLink);
    copyButton.textContent = "Copied";
  } catch (error) {
    copyButton.textContent = "Failed";
  }
});

copyButton.disabled = true;
updateCountdown();
