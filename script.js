const imageInput = document.getElementById("imageInput");
const dropzone = document.getElementById("dropzone");
const previewImage = document.getElementById("previewImage");
const previewVideo = document.getElementById("previewVideo");
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
const durationOptions = Array.from(document.querySelectorAll("[data-duration-hours]"));
const customDurationButton = document.getElementById("customDurationButton");
const customDurationField = document.getElementById("customDurationField");
const customDurationInput = document.getElementById("customDurationInput");
const durationHelp = document.getElementById("durationHelp");
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
const premiumChip = document.getElementById("premiumChip");
const adminActions = document.getElementById("adminActions");
const adminStatsButton = document.getElementById("adminStatsButton");
const adminImagesButton = document.getElementById("adminImagesButton");
const banPanelButton = document.getElementById("banPanelButton");
const adminStatsModal = document.getElementById("adminStatsModal");
const adminStatsBackdrop = document.getElementById("adminStatsBackdrop");
const adminStatsCloseButton = document.getElementById("adminStatsCloseButton");
const adminImagesModal = document.getElementById("adminImagesModal");
const adminImagesBackdrop = document.getElementById("adminImagesBackdrop");
const adminImagesCloseButton = document.getElementById("adminImagesCloseButton");
const adminImagesRefreshButton = document.getElementById("adminImagesRefreshButton");
const adminImagesList = document.getElementById("adminImagesList");
const banModal = document.getElementById("banModal");
const banBackdrop = document.getElementById("banBackdrop");
const banCloseButton = document.getElementById("banCloseButton");
const adminRefreshButton = document.getElementById("adminRefreshButton");
const adminGlobalUploads = document.getElementById("adminGlobalUploads");
const adminGlobalViews = document.getElementById("adminGlobalViews");
const adminLeaderboard = document.getElementById("adminLeaderboard");
const banForm = document.getElementById("banForm");
const banUsername = document.getElementById("banUsername");
const banReason = document.getElementById("banReason");
const banDuration = document.getElementById("banDuration");
const banSubmitButton = document.getElementById("banSubmitButton");
const unbanButton = document.getElementById("unbanButton");
const banStatus = document.getElementById("banStatus");
const premiumButton = document.getElementById("premiumButton");
const premiumModal = document.getElementById("premiumModal");
const premiumBackdrop = document.getElementById("premiumBackdrop");
const premiumCloseButton = document.getElementById("premiumCloseButton");
const premiumCoins = Array.from(document.querySelectorAll("[data-premium-coin]"));
const premiumAddressLabel = document.getElementById("premiumAddressLabel");
const premiumAddressValue = document.getElementById("premiumAddressValue");
const premiumCopyAddressButton = document.getElementById("premiumCopyAddressButton");
const premiumRequestForm = document.getElementById("premiumRequestForm");
const premiumTxHash = document.getElementById("premiumTxHash");
const premiumSubmitButton = document.getElementById("premiumSubmitButton");
const premiumStatus = document.getElementById("premiumStatus");
const premiumStatusLabel = document.getElementById("premiumStatusLabel");
const bannedModal = document.getElementById("bannedModal");
const bannedMessage = document.getElementById("bannedMessage");
const bannedBy = document.getElementById("bannedBy");
const bannedDuration = document.getElementById("bannedDuration");
const bannedUntil = document.getElementById("bannedUntil");
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
const ADMIN_IMAGES_ENDPOINT = "/api/admin/images";
const ADMIN_BAN_ENDPOINT = "/api/admin/ban";
const PREMIUM_CHECKOUT_ENDPOINT = "/api/premium/checkout";
const PREMIUM_REQUEST_ENDPOINT = "/api/premium/request";
const BAN_LOCK_STORAGE_KEY = "lurking_ban_lock";
const FREE_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const PREMIUM_MULTIPLIER = 3;
const PREMIUM_MAX_FILE_SIZE_BYTES = FREE_MAX_FILE_SIZE_BYTES * PREMIUM_MULTIPLIER;
const PREMIUM_POLL_INTERVAL_MS = 20000;

let countdownId = null;
let selectedDurationHours = 3;
let uploads = [];
let selectedUploadId = null;
let statsRefreshId = null;
let authMode = "signup";
let currentUser = null;
let banLockId = null;
let selectedPremiumCoin = "LITECOIN";
let premiumCheckout = null;
let premiumPollId = null;

function setBodyModalState() {
  const anyModalOpen = !authModal.hidden || !adminStatsModal.hidden || !adminImagesModal.hidden || !banModal.hidden || !premiumModal.hidden || !bannedModal.hidden;
  document.body.classList.toggle("modal-open", anyModalOpen);
}

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

function getCurrentUploadLimitBytes() {
  return currentUser?.premium ? PREMIUM_MAX_FILE_SIZE_BYTES : FREE_MAX_FILE_SIZE_BYTES;
}

function getCurrentUploadLimitLabel() {
  return formatSize(getCurrentUploadLimitBytes());
}

function updateDurationControls() {
  const isPremium = Boolean(currentUser?.premium);
  const isCustomSelected = ![3, 24, 48].includes(selectedDurationHours);

  customDurationButton.hidden = !isPremium;
  customDurationField.hidden = !(isPremium && isCustomSelected);
  durationHelp.textContent = isPremium
    ? `Premium uploads: up to ${getCurrentUploadLimitLabel()}, plus custom expiry from 1 to 8760 hours.`
    : `Free uploads: up to ${getCurrentUploadLimitLabel()}, with 3h, 24h, or 48h expiry.`;

  if (!isPremium && isCustomSelected) {
    selectedDurationHours = 3;
  }

  durationOptions.forEach((option) => {
    const optionValue = option.dataset.durationHours;
    const isSelected = optionValue === "custom"
      ? ![3, 24, 48].includes(selectedDurationHours)
      : Number(optionValue) === selectedDurationHours;
    option.classList.toggle("is-selected", isSelected);
  });

  if (!customDurationField.hidden) {
    customDurationInput.value = String(selectedDurationHours);
  }
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

function formatBanDuration(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return "--";
  if (value < 24) return `${value} hour${value === 1 ? "" : "s"}`;
  if (value % 24 === 0) {
    const days = value / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return `${value} hours`;
}

function readBanLock() {
  try {
    const raw = localStorage.getItem(BAN_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const ban = JSON.parse(raw);
    if (!ban?.expiresAt || Date.parse(ban.expiresAt) <= Date.now()) {
      localStorage.removeItem(BAN_LOCK_STORAGE_KEY);
      return null;
    }
    return ban;
  } catch {
    return null;
  }
}

function storeBanLock(ban) {
  try {
    localStorage.setItem(BAN_LOCK_STORAGE_KEY, JSON.stringify(ban));
  } catch {
    // Ignore storage errors.
  }
}

function clearBanLock() {
  if (banLockId) {
    clearTimeout(banLockId);
    banLockId = null;
  }
  try {
    localStorage.removeItem(BAN_LOCK_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function getActiveBan() {
  return currentUser?.ban || readBanLock();
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
  previewVideo.pause();
  previewVideo.removeAttribute("src");
  previewVideo.load();
  previewVideo.style.display = "none";
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
  if (readBanLock()) {
    return;
  }
  setAuthMode(mode);
  authModal.hidden = false;
  setBodyModalState();
  authUsername.focus();
}

function closeAuthModal() {
  authModal.hidden = true;
  authForm.reset();
  setBodyModalState();
}

function renderAuthState() {
  const loggedIn = Boolean(currentUser);
  const isAdmin = Boolean(currentUser && currentUser.role === "admin");
  const isPremium = Boolean(currentUser && currentUser.premium);
  authActions.hidden = loggedIn;
  accountActions.hidden = !loggedIn;
  adminActions.hidden = !isAdmin;
  accountChip.textContent = loggedIn ? `@${currentUser.username}` : "guest";
  premiumChip.hidden = !isPremium;
  premiumButton.hidden = !loggedIn || isPremium;
  premiumStatusLabel.textContent = isPremium ? "Active" : "Not active";
  if (!isAdmin) {
    closeAdminStatsModal();
    closeAdminImagesModal();
    closeBanModal();
  }
  if (!loggedIn || isPremium) {
    closePremiumModal();
  }
  logoutButton.hidden = Boolean(currentUser?.ban || readBanLock());
  updateDurationControls();
  refreshUploadList();
  enforceBanState();
}

function closeAdminStatsModal() {
  adminStatsModal.hidden = true;
  setBodyModalState();
}

function closeAdminImagesModal() {
  adminImagesModal.hidden = true;
  setBodyModalState();
}

function closeBanModal() {
  banModal.hidden = true;
  setBodyModalState();
}

function closePremiumModal() {
  premiumModal.hidden = true;
  premiumRequestForm.reset();
  premiumCopyAddressButton.textContent = "Copy";
  premiumStatus.textContent = "Send the exact generated amount to the selected address. Premium will activate automatically after the payment is detected.";
  if (premiumPollId) {
    clearInterval(premiumPollId);
    premiumPollId = null;
  }
  setBodyModalState();
}

function scheduleBanUnlock(expiresAt) {
  if (banLockId) {
    clearTimeout(banLockId);
    banLockId = null;
  }

  const remaining = Date.parse(expiresAt) - Date.now();
  if (remaining <= 0) {
    clearBanLock();
    document.body.classList.remove("ban-locked");
    bannedModal.hidden = true;
    setBodyModalState();
    return;
  }

  banLockId = setTimeout(() => {
    clearBanLock();
    document.body.classList.remove("ban-locked");
    bannedModal.hidden = true;
    setBodyModalState();
    loadCurrentUser();
  }, remaining + 250);
}

function openBannedModal(ban) {
  if (!ban) {
    return;
  }

  storeBanLock(ban);
  authModal.hidden = true;
  adminStatsModal.hidden = true;
  adminImagesModal.hidden = true;
  banModal.hidden = true;
  premiumModal.hidden = true;
  bannedMessage.textContent = `This account was banned by ${ban.bannedBy || "an admin"} and cannot use lurki.ng until the ban expires.`;
  bannedBy.textContent = ban.bannedBy || "--";
  bannedDuration.textContent = formatBanDuration(ban.durationHours);
  bannedUntil.textContent = formatDate(ban.expiresAt);
  bannedModal.hidden = false;
  document.body.classList.add("ban-locked");
  setBodyModalState();
  scheduleBanUnlock(ban.expiresAt);
}

function enforceBanState() {
  const activeBan = getActiveBan();
  const isBanned = Boolean(activeBan);

  loginButton.disabled = isBanned;
  signupButton.disabled = isBanned;
  logoutButton.disabled = isBanned;
  imageInput.disabled = isBanned;
  durationOptions.forEach((option) => {
    option.disabled = isBanned;
  });

  if (isBanned) {
    copyButton.disabled = true;
    copyRawButton.disabled = true;
    deleteButton.disabled = true;
    openBannedModal(activeBan);
    return;
  }

  clearBanLock();
  document.body.classList.remove("ban-locked");
  bannedModal.hidden = true;
  setBodyModalState();
  renderSelectedUpload();
}

function openAdminStatsModal() {
  if (!currentUser || currentUser.role !== "admin") {
    return;
  }

  adminImagesModal.hidden = true;
  banModal.hidden = true;
  adminStatsModal.hidden = false;
  setBodyModalState();
  loadAdminStats();
}

function openAdminImagesModal() {
  if (!currentUser || currentUser.role !== "admin") {
    return;
  }

  adminStatsModal.hidden = true;
  banModal.hidden = true;
  adminImagesModal.hidden = false;
  setBodyModalState();
  loadAdminImages();
}

function openBanModal() {
  if (!currentUser || currentUser.role !== "admin") {
    return;
  }

  adminStatsModal.hidden = true;
  adminImagesModal.hidden = true;
  banModal.hidden = false;
  banStatus.textContent = "Only admin accounts can use this panel.";
  setBodyModalState();
  banUsername.focus();
}

function renderPremiumCheckout() {
  const coinData = premiumCheckout?.coins?.[selectedPremiumCoin];
  premiumCoins.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.premiumCoin === selectedPremiumCoin);
  });
  premiumAddressLabel.textContent = `${coinData?.label || selectedPremiumCoin} address${coinData?.minimumAmount ? ` · min ${coinData.minimumAmount}` : ""}`;
  premiumAddressValue.textContent = coinData?.address || "Set your wallet address first.";
}

async function loadPremiumCheckout() {
  if (!currentUser) {
    return;
  }

  try {
    const response = await fetch(PREMIUM_CHECKOUT_ENDPOINT, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Could not load premium checkout.");
    }

    premiumCheckout = payload;
    premiumStatusLabel.textContent = payload.premium ? "Active" : "Not active";
    premiumStatus.textContent = payload.premium
      ? "This account already has premium."
      : "Send a confirmed payment to the selected address, then paste the transaction hash to unlock premium automatically.";
    renderPremiumCheckout();
  } catch (error) {
    premiumStatus.textContent = error instanceof Error ? error.message : "Could not load premium checkout.";
  }
}

async function openPremiumModal() {
  if (!currentUser || currentUser.premium) {
    return;
  }

  premiumModal.hidden = false;
  premiumStatus.textContent = "Send a confirmed payment to the selected address, then paste the transaction hash to unlock premium automatically.";
  setBodyModalState();
  await loadPremiumCheckout();
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

async function loadAdminImages() {
  if (!currentUser || currentUser.role !== "admin") {
    return;
  }

  try {
    const response = await fetch(ADMIN_IMAGES_ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      adminImagesList.innerHTML = '<div class="extra-placeholder">Could not load global uploads</div>';
      return;
    }

    const payload = await response.json();
    if (!Array.isArray(payload.images) || !payload.images.length) {
      adminImagesList.innerHTML = '<div class="extra-placeholder">No active global uploads right now</div>';
      return;
    }

    adminImagesList.innerHTML = payload.images.map((image) => `
      <div class="admin-image-item">
        <div class="admin-image-top">
          <span class="admin-image-name">${image.fileName}</span>
          <span class="admin-image-meta">@${image.uploader}</span>
        </div>
        <div class="admin-image-bottom">
          <span class="admin-image-meta">${image.contentType}</span>
          <span class="admin-image-meta">${formatDate(image.expiresAt)}</span>
        </div>
      </div>
    `).join("");
  } catch (error) {
    adminImagesList.innerHTML = '<div class="extra-placeholder">Could not load global uploads</div>';
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
      if (currentUser.ban) {
        openBannedModal({
          username: currentUser.username,
          ...currentUser.ban,
        });
      }
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

  const mediaType = String(selected.contentType || "");
  if (mediaType.startsWith("video/")) {
    previewVideo.src = selected.previewUrl;
    previewVideo.style.display = "block";
    previewImage.style.display = "none";
  } else {
    previewImage.src = selected.previewUrl;
    previewImage.style.display = "block";
    previewVideo.pause();
    previewVideo.removeAttribute("src");
    previewVideo.load();
    previewVideo.style.display = "none";
  }
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
      contentType: payload.contentType || file.type || "",
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
  if (getActiveBan()) {
    return;
  }

  const files = Array.from(fileList || []).filter((file) => {
    const type = String(file?.type || "");
    return type.startsWith("image/") || type.startsWith("video/");
  });
  const maxFileSizeBytes = getCurrentUploadLimitBytes();

  if (!files.length) {
    statusPill.textContent = "Media Only";
    return;
  }

  for (let index = 0; index < files.length; index += 1) {
    if (Number(files[index].size || 0) > maxFileSizeBytes) {
      statusPill.textContent = "Too Large";
      fileName.textContent = `Max upload size is ${getCurrentUploadLimitLabel()}${currentUser?.premium ? "." : " unless you buy premium."}`;
      fileName.title = "";
      displayName.textContent = files[index].name;
      fileSize.textContent = formatSize(files[index].size);
      expiryTimer.textContent = "--:--:--";
      expiryExact.textContent = "--";
      viewCount.textContent = "0";
      copyButton.disabled = true;
      copyRawButton.disabled = true;
      deleteButton.disabled = true;
      continue;
    }
    statusPill.textContent = files.length > 1 ? `Queue ${index + 1}/${files.length}` : "Uploading";
    await addUploadedFile(files[index]);
  }
}

async function deleteSelectedUpload() {
  if (getActiveBan()) {
    return;
  }

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

function closePremiumModal() {
  premiumModal.hidden = true;
  premiumRequestForm.reset();
  premiumCopyAddressButton.textContent = "Copy";
  premiumStatus.textContent = "Send the exact generated amount to the selected address. Premium will activate automatically after the payment is detected.";
  if (premiumPollId) {
    clearInterval(premiumPollId);
    premiumPollId = null;
  }
  setBodyModalState();
}

function renderPremiumCheckout() {
  const coinData = premiumCheckout?.coins?.[selectedPremiumCoin];
  premiumCoins.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.premiumCoin === selectedPremiumCoin);
  });
  premiumAddressLabel.textContent = `${coinData?.label || selectedPremiumCoin} address`;
  premiumAddressValue.textContent = coinData?.address || "Set your wallet address first.";
  if (coinData?.expectedAmount && coinData?.currencySymbol) {
    premiumStatus.textContent = `Send exactly ${coinData.expectedAmount} ${coinData.currencySymbol}. Order expires ${formatDate(coinData.expiresAt)}. Premium will activate automatically after detection.`;
  }
}

async function loadPremiumCheckout() {
  if (!currentUser) {
    return;
  }

  try {
    const response = await fetch(PREMIUM_CHECKOUT_ENDPOINT, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Could not load premium checkout.");
    }

    if (payload.premium) {
      currentUser = {
        ...currentUser,
        premium: true,
      };
      premiumStatusLabel.textContent = "Active";
      premiumStatus.textContent = "Premium is active on this account.";
      renderAuthState();
      window.setTimeout(() => {
        closePremiumModal();
      }, 800);
      return;
    }

    premiumCheckout = payload;
    premiumStatusLabel.textContent = "Waiting for payment";
    renderPremiumCheckout();
  } catch (error) {
    premiumStatus.textContent = error instanceof Error ? error.message : "Could not load premium checkout.";
  }
}

async function openPremiumModal() {
  if (!currentUser || currentUser.premium) {
    return;
  }

  premiumModal.hidden = false;
  premiumStatus.textContent = "Creating payment order...";
  setBodyModalState();
  await loadPremiumCheckout();
  if (premiumPollId) {
    clearInterval(premiumPollId);
  }
  premiumPollId = setInterval(() => {
    loadPremiumCheckout();
  }, PREMIUM_POLL_INTERVAL_MS);
}

durationOptions.forEach((option) => {
  option.addEventListener("click", () => {
    if (option.dataset.durationHours === "custom") {
      selectedDurationHours = Math.max(1, Math.min(8760, Number(customDurationInput.value) || 72));
    } else {
      selectedDurationHours = Number(option.dataset.durationHours) || 3;
    }
    updateDurationControls();
  });
});

customDurationInput.addEventListener("input", () => {
  selectedDurationHours = Math.max(1, Math.min(8760, Number(customDurationInput.value) || 1));
  updateDurationControls();
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
  if (getActiveBan()) {
    return;
  }

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
  if (getActiveBan()) {
    return;
  }

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
adminStatsButton.addEventListener("click", openAdminStatsModal);
adminImagesButton.addEventListener("click", openAdminImagesModal);
banPanelButton.addEventListener("click", openBanModal);
premiumButton.addEventListener("click", openPremiumModal);
adminRefreshButton.addEventListener("click", loadAdminStats);
adminImagesRefreshButton.addEventListener("click", loadAdminImages);
premiumBackdrop.addEventListener("click", closePremiumModal);
premiumCloseButton.addEventListener("click", closePremiumModal);
premiumCoins.forEach((button) => {
  button.addEventListener("click", () => {
    selectedPremiumCoin = button.dataset.premiumCoin || "LITECOIN";
    renderPremiumCheckout();
  });
});
premiumCopyAddressButton.addEventListener("click", async () => {
  const address = premiumAddressValue.textContent || "";

  if (!address || address === "Loading...") {
    return;
  }

  try {
    await navigator.clipboard.writeText(address);
    premiumCopyAddressButton.textContent = "Copied";
  } catch (error) {
    premiumCopyAddressButton.textContent = "Failed";
  }

  window.setTimeout(() => {
    premiumCopyAddressButton.textContent = "Copy";
  }, 1200);
});
premiumRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    premiumStatus.textContent = "Log in to request premium.";
    return;
  }

  premiumSubmitButton.disabled = true;
  premiumStatus.textContent = "Checking transaction on-chain...";

  try {
    const response = await fetch(PREMIUM_REQUEST_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        coin: selectedPremiumCoin,
        txHash: premiumTxHash.value,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Could not verify payment.");
    }

    currentUser = payload.user || { ...currentUser, premium: true };
    premiumStatus.textContent = `Premium unlocked with ${payload.verification.coin}.`;
    premiumRequestForm.reset();
    renderAuthState();
    window.setTimeout(() => {
      closePremiumModal();
    }, 800);
  } catch (error) {
    premiumStatus.textContent = error instanceof Error ? error.message : "Could not verify payment.";
  } finally {
    premiumSubmitButton.disabled = false;
  }
});
loginButton.addEventListener("click", () => openAuthModal("login"));
signupButton.addEventListener("click", () => openAuthModal("signup"));
logoutButton.addEventListener("click", async () => {
  if (getActiveBan()) {
    return;
  }
  await fetch(AUTH_LOGOUT_ENDPOINT, { method: "POST" });
  currentUser = null;
  uploads = uploads.filter((upload) => upload.source !== "account");
  if (selectedUploadId && !uploads.some((upload) => upload.id === selectedUploadId)) {
    selectedUploadId = uploads[0]?.id || null;
    renderSelectedUpload();
  }
  closeAdminStatsModal();
  closeAdminImagesModal();
  closeBanModal();
  closePremiumModal();
  renderAuthState();
});
authBackdrop.addEventListener("click", closeAuthModal);
authCloseButton.addEventListener("click", closeAuthModal);
adminStatsBackdrop.addEventListener("click", closeAdminStatsModal);
adminStatsCloseButton.addEventListener("click", closeAdminStatsModal);
adminImagesBackdrop.addEventListener("click", closeAdminImagesModal);
adminImagesCloseButton.addEventListener("click", closeAdminImagesModal);
banBackdrop.addEventListener("click", closeBanModal);
banCloseButton.addEventListener("click", closeBanModal);
authToggleMode.addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!banModal.hidden) {
    closeBanModal();
    return;
  }

  if (!adminImagesModal.hidden) {
    closeAdminImagesModal();
    return;
  }

  if (!adminStatsModal.hidden) {
    closeAdminStatsModal();
    return;
  }

  if (!premiumModal.hidden) {
    closePremiumModal();
    return;
  }

  if (!authModal.hidden) {
    closeAuthModal();
  }
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
      if (response.status === 403 && payload?.ban) {
        openBannedModal({
          username: authUsername.value.trim().toLowerCase(),
          ...payload.ban,
        });
        closeAuthModal();
        return;
      }
      throw new Error(payload.error || "Auth failed.");
    }

    currentUser = payload.user || null;
    await loadCurrentUser();
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
    if (currentUser && payload.username === currentUser.username) {
      currentUser = {
        ...currentUser,
        ban: payload.ban,
      };
      renderAuthState();
    }
  } catch (error) {
    banStatus.textContent = error instanceof Error ? error.message : "Ban failed.";
  } finally {
    banSubmitButton.disabled = false;
  }
});

unbanButton.addEventListener("click", async () => {
  const username = banUsername.value.trim().toLowerCase();

  if (!username) {
    banStatus.textContent = "Enter a username to unban.";
    return;
  }

  unbanButton.disabled = true;
  banStatus.textContent = "Removing ban...";

  try {
    const response = await fetch(ADMIN_BAN_ENDPOINT, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ username }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unban failed.");
    }

    banStatus.textContent = `${payload.username} unbanned by ${payload.unbannedBy}.`;
    banReason.value = "";
    banDuration.value = "24";
  } catch (error) {
    banStatus.textContent = error instanceof Error ? error.message : "Unban failed.";
  } finally {
    unbanButton.disabled = false;
  }
});

resetPreview();
refreshUploadList();
updateCountdown();
setAuthMode("signup");
renderAuthState();
setBodyModalState();
loadCurrentUser();
updateDurationControls();
