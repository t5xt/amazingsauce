const imageInput = document.getElementById("imageInput");
const dropzone = document.getElementById("dropzone");
const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const fileName = document.getElementById("fileName");
const displayName = document.getElementById("displayName");
const fileSize = document.getElementById("fileSize");
const expiryTimer = document.getElementById("expiryTimer");
const expiryExact = document.getElementById("expiryExact");
const statusPill = document.getElementById("statusPill");
const uploadPanel = document.getElementById("upload-panel");
const copyButton = document.getElementById("copyButton");
const copyRawButton = document.getElementById("copyRawButton");
const deleteButton = document.getElementById("deleteButton");
const durationOptions = Array.from(document.querySelectorAll(".duration-option"));
const progressCard = document.getElementById("progressCard");
const progressFill = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");
const progressValue = document.getElementById("progressValue");
const qrImage = document.getElementById("qrImage");
const qrPlaceholder = document.getElementById("qrPlaceholder");
const uploadList = document.getElementById("uploadList");
const uploadCount = document.getElementById("uploadCount");
const uploadsSource = document.getElementById("uploadsSource");
const viewCount = document.getElementById("viewCount");
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const logoutButton = document.getElementById("logoutButton");
const authActions = document.getElementById("authActions");
const accountActions = document.getElementById("accountActions");
const accountChip = document.getElementById("accountChip");
const adminActions = document.getElementById("adminActions");
const adminStatsButton = document.getElementById("adminStatsButton");
const banPanelButton = document.getElementById("banPanelButton");
const adminCard = document.getElementById("adminCard");
const banCard = document.getElementById("banCard");
const adminRefreshButton = document.getElementById("adminRefreshButton");
const adminGlobalUploads = document.getElementById("adminGlobalUploads");
const adminGlobalViews = document.getElementById("adminGlobalViews");
const adminLeaderboard = document.getElementById("adminLeaderboard");
const banForm = document.getElementById("banForm");
const banUsername = document.getElementById("banUsername");
const banReason = document.getElementById("banReason");
const banDuration = document.getElementById("banDuration");
const banSubmitButton = document.getElementById("banSubmitButton");
const banStatus = document.getElementById("banStatus");
const authModal = document.getElementById("authModal");
const authBackdrop = document.getElementById("authBackdrop");
const authCloseButton = document.getElementById("authCloseButton");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authKicker = document.getElementById("authKicker");
const authSubmitButton = document.getElementById("authSubmitButton");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authStatus = document.getElementById("authStatus");
const authToggleMode = document.getElementById("authToggleMode");

const UPLOAD_ENDPOINT = "/api/upload";
const DELETE_ENDPOINT = "/api/delete";
const AUTH_ME_ENDPOINT = "/api/auth/me";
const AUTH_LOGIN_ENDPOINT = "/api/auth/login";
const AUTH_SIGNUP_ENDPOINT = "/api/auth/signup";
const AUTH_LOGOUT_ENDPOINT = "/api/auth/logout";
const ACCOUNT_UPLOADS_ENDPOINT = "/api/account/uploads";
const ADMIN_STATS_ENDPOINT = "/api/admin/stats";
const ADMIN_BAN_ENDPOINT = "/api/admin/ban";

let countdownId = null;
let selectedDurationHours = 3;
let uploads = [];
let selectedUploadId = null;
let statsRefreshId = null;
let authMode = "signup";
let currentUser = null;
let adminStatsOpen = false;
let banPanelOpen = false;

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

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function getSelectedUpload() {
  return uploads.find((upload) => upload.id === selectedUploadId) || null;
}

function getQrUrl(url) {
  return `https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(url)}`;
}

function setProgress(percent, label) {
  progressCard.hidden = false;
  progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  progressValue.textContent = `${Math.round(percent)}%`;
  progressLabel.textContent = label;
}

function hideProgress() {
  progressCard.hidden = true;
  progressFill.style.width = "0%";
  progressValue.textContent = "0%";
  progressLabel.textContent = "Uploading...";
}

function resetPreview() {
  previewImage.removeAttribute("src");
  previewImage.style.display = "none";
  previewPlaceholder.style.display = "grid";
  fileName.textContent = "No link yet";
  fileName.title = "";
  displayName.textContent = "No file yet";
  fileSize.textContent = "0 MB";
  expiryTimer.textContent = "--:--:--";
  expiryExact.textContent = "--";
  viewCount.textContent = "0";
  qrImage.removeAttribute("src");
  qrImage.style.display = "none";
  qrPlaceholder.style.display = "grid";
  copyButton.disabled = true;
  copyRawButton.disabled = true;
  deleteButton.disabled = true;
  copyButton.textContent = "Copy";
  copyRawButton.textContent = "Raw";
  deleteButton.textContent = "Delete upload";
}

function refreshUploadList() {
  uploadCount.textContent = String(uploads.length);
  uploadsSource.textContent = currentUser ? `@${currentUser.username}` : "Guest mode";

  if (!uploads.length) {
    uploadList.innerHTML = '<div class="extra-placeholder">Your uploaded images will show here</div>';
    return;
  }

  uploadList.innerHTML = uploads.map((upload) => `
    <button class="upload-item${upload.id === selectedUploadId ? " is-selected" : ""}" type="button" data-upload-id="${upload.id}">
      <div class="upload-item-top">
        <span class="upload-item-name">${upload.fileName}</span>
        <span class="upload-item-status">${upload.status}</span>
      </div>
      <div class="upload-item-bottom">
        <span class="upload-item-meta">${formatSize(upload.size)} | ${upload.durationHours}h</span>
        <span class="upload-item-meta">${formatDate(upload.expiresAt)}</span>
      </div>
    </button>
  `).join("");

  Array.from(uploadList.querySelectorAll(".upload-item")).forEach((item) => {
    item.addEventListener("click", () => {
      selectedUploadId = item.dataset.uploadId;
      renderSelectedUpload();
    });
  });
}

function setAuthMode(mode) {
  authMode = mode === "login" ? "login" : "signup";
  authKicker.textContent = authMode === "login" ? "Welcome back" : "Optional account";
  authTitle.textContent = authMode === "login" ? "Log in" : "Sign up";
  authSubmitButton.textContent = authMode === "login" ? "Log in" : "Create account";
  authToggleMode.textContent = authMode === "login"
    ? "Need an account? Sign up"
    : "Already have an account? Log in";
  authPassword.autocomplete = authMode === "login" ? "current-password" : "new-password";
  authStatus.textContent = authMode === "login"
    ? "Guests can still upload without signing in."
    : "Use letters, numbers, and underscores in your username.";
}

function openAuthModal(mode) {
  setAuthMode(mode);
  authModal.hidden = false;
  authUsername.focus();
}

function closeAuthModal() {
  authModal.hidden = true;
  authForm.reset();
}

function renderAuthState() {
  const loggedIn = Boolean(currentUser);
  const isAdmin = Boolean(currentUser && currentUser.role === "admin");
  authActions.hidden = loggedIn;
  accountActions.hidden = !loggedIn;
  adminActions.hidden = !isAdmin;
  adminCard.hidden = !isAdmin || !adminStatsOpen;
  banCard.hidden = !isAdmin || !banPanelOpen;
  accountChip.textContent = loggedIn ? `@${currentUser.username}` : "guest";
  refreshUploadList();
}

async function loadAdminStats() {
  if (!currentUser || currentUser.role !== "admin") {
    return;
  }

  try {
    const response = await fetch(ADMIN_STATS_ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    adminGlobalUploads.textContent = String(payload.globalUploadCount || 0);
    adminGlobalViews.textContent = String(payload.globalViewCount || 0);

    if (!Array.isArray(payload.topUploaders) || !payload.topUploaders.length) {
      adminLeaderboard.innerHTML = '<div class="extra-placeholder">No upload stats yet</div>';
      return;
    }

    adminLeaderboard.innerHTML = payload.topUploaders.map((entry, index) => `
      <div class="admin-leaderboard-item">
        <strong>#${index + 1} ${entry.username}</strong>
        <span>${entry.uploads} uploads</span>
      </div>
    `).join("");
  } catch (error) {
    // Ignore admin stats errors.
  }
}

function mergeUploads(newUploads) {
  const byId = new Map(uploads.map((upload) => [upload.id, upload]));

  newUploads.forEach((upload) => {
    const existing = byId.get(upload.id) || {};
    byId.set(upload.id, {
      ...existing,
      ...upload,
      expiresAt: upload.expiresAt ? Date.parse(upload.expiresAt) : existing.expiresAt,
      previewUrl: existing.previewUrl || "",
      source: upload.source || existing.source || "account",
    });
  });

  uploads = Array.from(byId.values()).sort((a, b) => {
    const aTime = a.expiresAt || 0;
    const bTime = b.expiresAt || 0;
    return bTime - aTime;
  });
}

async function loadAccountUploads() {
  if (!currentUser) {
    return;
  }

  try {
    const response = await fetch(ACCOUNT_UPLOADS_ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    const normalized = Array.isArray(payload.uploads) ? payload.uploads.map((upload) => ({
      ...upload,
      previewUrl: upload.rawUrl || "",
      source: "account",
    })) : [];
    mergeUploads(normalized);
    refreshUploadList();
    if (!selectedUploadId && uploads.length) {
      selectedUploadId = uploads[0].id;
      renderSelectedUpload();
    }
  } catch (error) {
    // Ignore account upload sync failures.
  }
}

async function loadCurrentUser() {
  try {
    const response = await fetch(AUTH_ME_ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      currentUser = null;
      renderAuthState();
      return;
    }
    const payload = await response.json();
    currentUser = payload.user || null;
    renderAuthState();
    if (currentUser) {
      await loadAccountUploads();
      await loadAdminStats();
    }
  } catch (error) {
    currentUser = null;
    renderAuthState();
  }
}

function updateCountdown() {
  const selected = getSelectedUpload();
  const selectedExpiresAt = selected?.expiresAt || null;

  if (!selected || selected.status === "Deleted") {
    expiryTimer.textContent = "--:--:--";
    statusPill.textContent = selected?.status || "Ready";
    uploadPanel.classList.remove("is-expired");
    return;
  }

  if (!selectedExpiresAt) {
    expiryTimer.textContent = "--:--:--";
    return;
  }

  const remaining = selectedExpiresAt - Date.now();
  expiryTimer.textContent = formatRemaining(remaining);

  if (remaining <= 0) {
    if (countdownId) {
      clearInterval(countdownId);
      countdownId = null;
    }
    if (selected) {
      selected.status = "Expired";
    }
    statusPill.textContent = "Expired";
    uploadPanel.classList.add("is-expired");
    refreshUploadList();
    return;
  }

  statusPill.textContent = selected?.status || "Live";
  uploadPanel.classList.remove("is-expired");
}

function startCountdown() {
  if (countdownId) {
    clearInterval(countdownId);
  }
  updateCountdown();
  countdownId = setInterval(updateCountdown, 1000);
}

async function refreshSelectedStats() {
  const selected = getSelectedUpload();
  if (!selected || !selected.statsUrl || selected.status === "Deleted") {
    return;
  }

  try {
    const response = await fetch(selected.statsUrl, { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    selected.views = Number(payload.views || 0);

    if (selected.id === selectedUploadId) {
      viewCount.textContent = String(selected.views);
    }
  } catch (error) {
    // Ignore stats refresh errors.
  }
}

function scheduleStatsRefresh() {
  if (statsRefreshId) {
    clearInterval(statsRefreshId);
    statsRefreshId = null;
  }

  const selected = getSelectedUpload();
  if (!selected || selected.status === "Deleted") {
    return;
  }

  refreshSelectedStats();
  statsRefreshId = setInterval(refreshSelectedStats, 15000);
}

function renderSelectedUpload() {
  const selected = getSelectedUpload();

  if (!selected) {
    resetPreview();
    statusPill.textContent = "Ready";
    if (countdownId) {
      clearInterval(countdownId);
      countdownId = null;
    }
    if (statsRefreshId) {
      clearInterval(statsRefreshId);
      statsRefreshId = null;
    }
    refreshUploadList();
    return;
  }

  fileName.textContent = selected.url;
  fileName.title = selected.url;
  displayName.textContent = selected.fileName;
  fileSize.textContent = formatSize(selected.size);
  expiryExact.textContent = formatDate(selected.expiresAt);
  viewCount.textContent = String(selected.views || 0);
  statusPill.textContent = selected.status;

  previewImage.src = selected.previewUrl;
  previewImage.style.display = "block";
  previewPlaceholder.style.display = "none";

  qrImage.src = getQrUrl(selected.url);
  qrImage.style.display = "block";
  qrPlaceholder.style.display = "none";

  copyButton.disabled = selected.status === "Deleted";
  copyRawButton.disabled = selected.status === "Deleted";
  deleteButton.disabled = selected.status === "Deleted";
  copyButton.textContent = "Copy";
  copyRawButton.textContent = "Raw";
  deleteButton.textContent = selected.status === "Deleted" ? "Deleted" : "Delete upload";

  refreshUploadList();
  startCountdown();
  scheduleStatsRefresh();
}

function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    const xhr = new XMLHttpRequest();

    formData.set("image", file);
    formData.set("expiresHours", String(selectedDurationHours));

    xhr.open("POST", UPLOAD_ENDPOINT, true);
    xhr.responseType = "text";

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const percent = (event.loaded / event.total) * 100;
      setProgress(percent, `Uploading ${file.name}`);
    });

    xhr.addEventListener("load", () => {
      let payload = null;

      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch (error) {
        payload = null;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload?.error || xhr.responseText || "Upload failed."));
        return;
      }

      if (!payload) {
        reject(new Error("Upload succeeded but returned an invalid response."));
        return;
      }

      resolve(payload);
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error while uploading."));
    });

    xhr.send(formData);
  });
}

async function addUploadedFile(file) {
  const previewUrl = URL.createObjectURL(file);

  try {
    const payload = await uploadFile(file);
    const upload = {
      id: payload.id,
      fileName: file.name,
      previewUrl,
      url: payload.url,
      rawUrl: payload.rawUrl,
      statsUrl: payload.statsUrl,
      deleteToken: payload.deleteToken,
      size: payload.size || file.size,
      expiresAt: Date.parse(payload.expiresAt),
      durationHours: selectedDurationHours,
      status: "Live",
      views: Number(payload.views || 0),
      ownerUserId: payload.ownerUserId || null,
      source: payload.ownerUserId ? "account" : "guest",
    };

    uploads = [upload, ...uploads];
    selectedUploadId = upload.id;
    hideProgress();
    renderSelectedUpload();
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    hideProgress();
    statusPill.textContent = "Error";
    fileName.textContent = error instanceof Error ? error.message : "Upload failed";
    fileName.title = "";
    displayName.textContent = file.name;
    fileSize.textContent = formatSize(file.size);
    expiryTimer.textContent = "--:--:--";
    expiryExact.textContent = "--";
    viewCount.textContent = "0";
    copyButton.disabled = true;
    copyRawButton.disabled = true;
    deleteButton.disabled = true;
  }
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => file?.type?.startsWith("image/"));

  if (!files.length) {
    statusPill.textContent = "Image Only";
    return;
  }

  for (let index = 0; index < files.length; index += 1) {
    statusPill.textContent = files.length > 1 ? `Queue ${index + 1}/${files.length}` : "Uploading";
    await addUploadedFile(files[index]);
  }
}

async function deleteSelectedUpload() {
  const selected = getSelectedUpload();

  if (!selected || selected.status === "Deleted") {
    return;
  }

  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";

  try {
    const response = await fetch(DELETE_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: selected.id,
        token: selected.deleteToken,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Delete failed.");
    }

    selected.status = "Deleted";
    renderSelectedUpload();
  } catch (error) {
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete upload";
    statusPill.textContent = "Error";
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
  handleFiles(event.target.files);
  imageInput.value = "";
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
  handleFiles(event.dataTransfer.files);
});

document.addEventListener("paste", (event) => {
  const files = Array.from(event.clipboardData?.files || []);
  if (files.length) {
    handleFiles(files);
  }
});

copyButton.addEventListener("click", async () => {
  const selected = getSelectedUpload();

  if (!selected || copyButton.disabled) {
    return;
  }

  try {
    await navigator.clipboard.writeText(selected.url);
    copyButton.textContent = "Copied";
  } catch (error) {
    copyButton.textContent = "Failed";
  }
});

copyRawButton.addEventListener("click", async () => {
  const selected = getSelectedUpload();

  if (!selected || copyRawButton.disabled) {
    return;
  }

  try {
    await navigator.clipboard.writeText(selected.rawUrl);
    copyRawButton.textContent = "Copied";
  } catch (error) {
    copyRawButton.textContent = "Failed";
  }
});

deleteButton.addEventListener("click", deleteSelectedUpload);
qrImage.addEventListener("error", () => {
  qrImage.style.display = "none";
  qrPlaceholder.style.display = "grid";
  qrPlaceholder.textContent = "QR unavailable right now. Copy the link instead.";
});
adminStatsButton.addEventListener("click", () => {
  adminStatsOpen = !adminStatsOpen;
  if (adminStatsOpen) {
    loadAdminStats();
  }
  renderAuthState();
});
banPanelButton.addEventListener("click", () => {
  banPanelOpen = !banPanelOpen;
  renderAuthState();
});
adminRefreshButton.addEventListener("click", loadAdminStats);
loginButton.addEventListener("click", () => openAuthModal("login"));
signupButton.addEventListener("click", () => openAuthModal("signup"));
logoutButton.addEventListener("click", async () => {
  await fetch(AUTH_LOGOUT_ENDPOINT, { method: "POST" });
  currentUser = null;
  adminStatsOpen = false;
  banPanelOpen = false;
  uploads = uploads.filter((upload) => upload.source !== "account");
  if (selectedUploadId && !uploads.some((upload) => upload.id === selectedUploadId)) {
    selectedUploadId = uploads[0]?.id || null;
    renderSelectedUpload();
  }
  renderAuthState();
});
authBackdrop.addEventListener("click", closeAuthModal);
authCloseButton.addEventListener("click", closeAuthModal);
authToggleMode.addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
});
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authSubmitButton.disabled = true;
  authStatus.textContent = authMode === "login" ? "Logging in..." : "Creating account...";

  try {
    const response = await fetch(authMode === "login" ? AUTH_LOGIN_ENDPOINT : AUTH_SIGNUP_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: authUsername.value,
        password: authPassword.value,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Auth failed.");
    }

    currentUser = payload.user || null;
    renderAuthState();
    await loadAccountUploads();
    await loadAdminStats();
    closeAuthModal();
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : "Auth failed.";
  } finally {
    authSubmitButton.disabled = false;
  }
});
banForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  banSubmitButton.disabled = true;
  banStatus.textContent = "Saving ban...";

  try {
    const response = await fetch(ADMIN_BAN_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: banUsername.value,
        reason: banReason.value,
        durationHours: Number(banDuration.value),
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Ban failed.");
    }

    banStatus.textContent = `${payload.username} banned until ${payload.ban.expiresAt}`;
    banForm.reset();
    banDuration.value = "24";
  } catch (error) {
    banStatus.textContent = error instanceof Error ? error.message : "Ban failed.";
  } finally {
    banSubmitButton.disabled = false;
  }
});

resetPreview();
refreshUploadList();
updateCountdown();
setAuthMode("signup");
renderAuthState();
loadCurrentUser();
