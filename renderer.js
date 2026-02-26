// ===== DOM Elements =====
const readerStatusEl = document.getElementById("readerStatus");
const statusDotEl = document.getElementById("statusDot");
const statusTextEl = document.getElementById("statusText");
const scanCardEl = document.getElementById("scanCard");
const scanTextEl = document.getElementById("scanText");
const cardInfoEl = document.getElementById("cardInfo");
const cardUIDEl = document.getElementById("cardUID");
const cardTimeEl = document.getElementById("cardTime");
const historyListEl = document.getElementById("historyList");
const historyEmptyEl = document.getElementById("historyEmpty");
const btnClearEl = document.getElementById("btnClear");
const errorToastEl = document.getElementById("errorToast");
const errorTextEl = document.getElementById("errorText");
const errorIconEl = errorToastEl.querySelector(".toast-icon");

// NDEF elements
const ndefRecordsEl = document.getElementById("ndefRecords");
const vcardDisplayEl = document.getElementById("vcardDisplay");
const vcardAvatarEl = document.getElementById("vcardAvatar");
const vcardNameEl = document.getElementById("vcardName");
const vcardOrgEl = document.getElementById("vcardOrg");
const vcardPhoneRowEl = document.getElementById("vcardPhoneRow");
const vcardPhoneEl = document.getElementById("vcardPhone");
const vcardEmailRowEl = document.getElementById("vcardEmailRow");
const vcardEmailEl = document.getElementById("vcardEmail");
const vcardUrlRowEl = document.getElementById("vcardUrlRow");
const vcardUrlEl = document.getElementById("vcardUrl");
const uriDisplayEl = document.getElementById("uriDisplay");
const uriValueEl = document.getElementById("uriValue");
const textDisplayEl = document.getElementById("textDisplay");
const agentIdValueEl = document.getElementById("agentIdValue");
const branchCodeValueEl = document.getElementById("branchCodeValue");
const rawDisplayEl = document.getElementById("rawDisplay");
const rawValueEl = document.getElementById("rawValue");

// Navigation Elements
const navTabs = document.querySelectorAll(".nav-tab");
const viewContainers = document.querySelectorAll(".view-container");

// Presensi Elements
const eventSelectEl = document.getElementById("eventSelect");
const btnRefreshEventsEl = document.getElementById("btnRefreshEvents");
const presensiScanCardEl = document.getElementById("presensiScanCard");
const presensiScanTextEl = document.getElementById("presensiScanText");
const presensiResultInfoEl = document.getElementById("presensiResultInfo");
const presensiStatusBoxEl = document.getElementById("presensiStatusBox");
const presensiAgentNameEl = document.getElementById("presensiAgentName");
const presensiBranchNameEl = document.getElementById("presensiBranchName");
const presensiTimeEl = document.getElementById("presensiTime");
const presensiAgentIdEl = document.getElementById("presensiAgentId");
const presensiBranchCodeEl = document.getElementById("presensiBranchCode");
const presenceListEl = document.getElementById("presenceList");
const presenceCountEl = document.getElementById("presenceCount");
const presenceEmptyEl = document.getElementById("presenceEmpty");
const agentSearchInputEl = document.getElementById("agentSearchInput");
const offlineWarningEl = document.getElementById("offlineWarning");

// ===== API & State =====
const BASE_URL = "https://newapi.propnex.id/api";

let currentView = "isiKartuView"; // Default view
let scanHistory = [];
let isReaderConnected = false;
let toastTimeout = null;
let isSubmitting = false;
let participantsList = []; // Local storage for searching
let currentCardData = null; // Track card currently on reader

// ===== Initialization =====
async function initApp() {
  setupNavigation();
  await loadEvents();

  btnRefreshEventsEl.addEventListener("click", loadEvents);
  eventSelectEl.addEventListener("change", (e) => {
    const eventId = e.target.value;
    if (eventId) {
      loadPresenceList(eventId);
    } else {
      renderPresenceList([]);
    }

    // Update scan area text if currently in presensi view
    if (currentView === "presensiView" && isReaderConnected) {
      updateReaderStatus("connected", statusTextEl.textContent);
    }
  });

  agentSearchInputEl.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = participantsList.filter((p) =>
      (p.bizname || "").toLowerCase().includes(query),
    );
    renderPresenceList(filtered, true); // true = skip updating participantsList
  });

  // Connectivity logic
  window.addEventListener("online", updateConnectivityStatus);
  window.addEventListener("offline", updateConnectivityStatus);
  updateConnectivityStatus();
}

function updateConnectivityStatus() {
  if (navigator.onLine) {
    offlineWarningEl.classList.add("hidden");
  } else if (currentView === "presensiView") {
    offlineWarningEl.classList.remove("hidden");
  } else {
    offlineWarningEl.classList.add("hidden");
  }
}

// ===== API Functions =====
async function fetchEventsApi() {
  try {
    const response = await fetch(`${BASE_URL}/curent-event`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Error fetching events:", error);
    return null;
  }
}

async function submitPresenceApi(agentId, branchCode, eventId) {
  // URL encoded form data
  const params = new URLSearchParams();
  params.append("accountid", agentId);
  params.append("branchcode", branchCode);
  params.append("accounttype", "1");
  params.append("id_event", eventId);

  try {
    const response = await fetch(`${BASE_URL}/add-vo-point`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error(
      `Failed to submit presence: ${response.status} ${response.statusText}`,
    );
  } catch (error) {
    console.error("Error submitting presence:", error);
    throw error;
  }
}

async function fetchPresenceApi(eventId) {
  try {
    const response = await fetch(`${BASE_URL}/event-point?id_event=${eventId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Error fetching presence:", error);
    return null;
  }
}

async function loadPresenceList(eventId) {
  if (!navigator.onLine) {
    presenceListEl.innerHTML =
      '<div class="presence-error">Koneksi internet diperlukan</div>';
    showError("Tidak dapat memuat daftar. Periksa koneksi internet Anda.");
    return;
  }

  presenceListEl.innerHTML =
    '<div class="presence-empty">Memuat daftar kehadiran...</div>';

  try {
    const data = await fetchPresenceApi(eventId);
    participantsList = (data?.point_list || []).sort((a, b) => {
      return new Date(b.date_history) - new Date(a.date_history);
    });
    renderPresenceList(participantsList);
  } catch (err) {
    console.error("Error loading presence list:", err);
    presenceListEl.innerHTML =
      '<div class="presence-error">Gagal memuat daftar</div>';
  }
}

function renderPresenceList(participants, isFilter = false) {
  // Only update header count if not filtering
  if (!isFilter) {
    presenceCountEl.textContent = `${participants.length} Peserta`;
  }

  // Clear existing items but keep the empty state if needed
  presenceListEl.innerHTML = "";

  if (participants.length === 0) {
    presenceListEl.appendChild(presenceEmptyEl);
    if (!isFilter) {
      presenceEmptyEl.textContent = eventSelectEl.value
        ? "Belum ada peserta yang hadir pada event ini"
        : "Pilih event untuk melihat daftar kehadiran";
    } else {
      presenceEmptyEl.textContent =
        "Tidak ada agen yang cocok dengan pencarian";
    }
    return;
  }

  participants.forEach((p) => {
    const itemEl = document.createElement("div");
    itemEl.className = "presence-item";

    const name = p.bizname || "Tanpa Nama";
    const initials = getInitials(name);
    const branch = p.branch ? `PropNex ${p.branch}` : "PropNex";
    const points = p.get_point || "0";

    // Photo handling
    const photoUrl = p.image_url
      ? `https://newapi.propnex.id/${p.image_url}`
      : null;
    const avatarHtml = photoUrl
      ? `<img src="${photoUrl}" class="presence-item-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
         <div class="presence-item-avatar" style="display:none">${initials}</div>`
      : `<div class="presence-item-avatar">${initials}</div>`;

    // Timestamp formatting: "25 Feb 2026 • 12:08"
    const timestamp = p.date_history || new Date();
    const timeFormatted = formatTime(timestamp).substring(0, 5); // HH:mm
    const dateFormatted = formatDate(timestamp); // "DD MMM YYYY"
    const displayTime = `${dateFormatted} • ${timeFormatted}`;

    itemEl.innerHTML = `
      ${avatarHtml}
      <div class="presence-item-info">
        <div class="presence-item-name">${name}</div>
        <div class="presence-item-detail">
          <span>${branch}</span>
        </div>
      </div>
      <div class="presence-item-right">
        <div class="presence-item-time">${displayTime}</div>
        <div class="presence-item-points">+${points} Pts</div>
      </div>
    `;

    presenceListEl.appendChild(itemEl);
  });
}

async function loadEvents() {
  if (!navigator.onLine) {
    eventSelectEl.innerHTML = '<option value="">Offline</option>';
    return;
  }

  eventSelectEl.innerHTML = '<option value="">Memuat event...</option>';
  eventSelectEl.disabled = true;
  btnRefreshEventsEl.disabled = true;

  try {
    const data = await fetchEventsApi();
    // API returns { current_event: [...] } based on Dart model
    const events = data?.current_event;
    if (events && events.length > 0) {
      eventSelectEl.innerHTML = '<option value="">-- Pilih Event --</option>';
      events.forEach((event) => {
        const option = document.createElement("option");
        option.value = event.id_event;
        option.textContent = event.name_event;
        eventSelectEl.appendChild(option);
      });

      // Auto-select if only one event
      if (events.length === 1) {
        eventSelectEl.value = events[0].id_event;
        loadPresenceList(events[0].id_event);
        // Also update scan instruction if already in presensi view
        if (currentView === "presensiView" && isReaderConnected) {
          updateReaderStatus("connected", statusTextEl.textContent);
        }
      }
    } else {
      eventSelectEl.innerHTML =
        '<option value="">Tidak ada event aktif</option>';
    }
  } catch (err) {
    console.error("Error loading events:", err);
    eventSelectEl.innerHTML = '<option value="">Gagal memuat event</option>';
    showError("Gagal memuat daftar event");
  } finally {
    eventSelectEl.disabled = false;
    btnRefreshEventsEl.disabled = false;
  }
}

// ===== Navigation Logic =====
function setupNavigation() {
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active from all tabs and views
      navTabs.forEach((t) => t.classList.remove("active"));
      viewContainers.forEach((v) => v.classList.remove("active"));

      // Add active to clicked target
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      document.getElementById(targetId).classList.add("active");
      currentView = targetId;

      // Warning if switching to Presensi but no event selected
      if (currentView === "presensiView" && !eventSelectEl.value) {
        showError("Silakan pilih Event terlebih dahulu untuk memulai Presensi");
        updateReaderStatus(
          isReaderConnected ? "connected" : "disconnected",
          statusTextEl.textContent,
        );
      }

      // If reader is connected, show current data and trigger an immediate fresh read
      if (isReaderConnected) {
        if (currentCardData) {
          // Show existing data instantly to prevent flicker
          if (currentView === "cekKartuView") {
            showCardDetected(currentCardData, true); // Silent
          } else if (currentView === "presensiView") {
            handlePresensiDetected(currentCardData, true); // Silent
          } else if (currentView === "isiKartuView") {
            autoPopulateWriteForm(currentCardData, false);
          }
        }

        // COMPULSORY REFRESH: Always fetch latest data from physical card on tab click
        // Silent=true ensures no flickering or sounds during this sync
        refreshCurrentCard(true);
      } else {
        // No reader connected
        showCardRemoved();
      }
    });
  });
}

// ===== Helper Functions =====
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatUID(uid) {
  if (!uid) return "-";
  return (
    uid
      .toUpperCase()
      .match(/.{1,2}/g)
      ?.join(":") || uid.toUpperCase()
  );
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ===== NDEF Display Functions =====

function resetNDEFDisplay() {
  // We NEVER hide the main containers anymore to prevent flickering
  // Just clear content or handle sub-items if really needed
}

function displayNDEFRecords(records) {
  // Reset sub-containers (no hiding)
  resetNDEFDisplay();

  if (!records || records.length === 0) return;

  // Always ensure containers are visible now
  cardInfoEl.classList.remove("hidden");
  ndefRecordsEl.classList.remove("hidden");

  for (const record of records) {
    if (!record) continue;

    switch (record.recordType) {
      case "vcard":
        vcardDisplayEl.classList.remove("hidden");
        displayVCard(record);
        break;
      case "uri":
        uriDisplayEl.classList.remove("hidden");
        displayURI(record);
        break;
      case "text":
        textDisplayEl.classList.remove("hidden");
        displayText(record);
        break;
      // Skip raw/default to keep UI clean
    }
  }
}

function displayVCard(data) {
  vcardDisplayEl.classList.remove("hidden");

  vcardNameEl.textContent = data.fullName || "Unknown";
  vcardOrgEl.textContent = data.organization || "-";
  vcardAvatarEl.textContent = getInitials(data.fullName);

  if (data.phone) {
    vcardPhoneRowEl.classList.remove("hidden");
    vcardPhoneEl.textContent = data.phone;
    vcardPhoneEl.style.cursor = "pointer";
    vcardPhoneEl.style.textDecoration = "underline";
    vcardPhoneEl.style.color = "#3b82f6";
    vcardPhoneEl.onclick = (e) => {
      e.preventDefault();
      window.nfcAPI.openExternal(`tel:${data.phone}`);
    };
  }

  if (data.email) {
    vcardEmailRowEl.classList.remove("hidden");
    vcardEmailEl.textContent = data.email;
    vcardEmailEl.style.cursor = "pointer";
    vcardEmailEl.style.textDecoration = "underline";
    vcardEmailEl.style.color = "#3b82f6";
    vcardEmailEl.onclick = (e) => {
      e.preventDefault();
      window.nfcAPI.openExternal(`mailto:${data.email}`);
    };
  }

  if (data.url) {
    vcardUrlRowEl.classList.remove("hidden");
    vcardUrlEl.textContent = data.url;
    vcardUrlEl.style.cursor = "pointer";
    vcardUrlEl.style.textDecoration = "underline";
    vcardUrlEl.style.color = "#3b82f6";
    vcardUrlEl.onclick = (e) => {
      e.preventDefault();
      window.nfcAPI.openExternal(data.url);
    };
  }
}

function displayURI(data) {
  uriDisplayEl.classList.remove("hidden");
  uriValueEl.textContent = data.uri || "-";
  if (data.uri) {
    uriValueEl.style.cursor = "pointer";
    uriValueEl.style.textDecoration = "underline";
    uriValueEl.style.color = "#3b82f6";
    uriValueEl.onclick = (e) => {
      e.preventDefault();
      window.nfcAPI.openExternal(data.uri);
    };
  }
}

function displayText(data) {
  textDisplayEl.classList.remove("hidden");
  const rawText = data.text || "";

  // Format based on user request "340;1" -> Agent ID: 340, Branch: 1
  let agentId = "-";
  let branchCode = "-";

  if (rawText.includes(";")) {
    const parts = rawText.split(";");
    agentId = parts[0]?.trim() || "-";
    branchCode = parts[1]?.trim() || "-";
  } else if (rawText.includes(",")) {
    const parts = rawText.split(",");
    agentId = parts[0]?.trim() || "-";
    branchCode = parts[1]?.trim() || "-";
  } else {
    // Fallback if not split
    agentId = rawText || "-";
  }

  agentIdValueEl.textContent = agentId;
  branchCodeValueEl.textContent = branchCode;
}

function displayRaw(data) {
  rawDisplayEl.classList.remove("hidden");
  rawValueEl.textContent =
    data.rawText || data.data || data.rawHex || JSON.stringify(data);
}

// ===== UI Update Functions =====
function updateReaderStatus(status, readerName) {
  isReaderConnected = status === "connected";

  if (isReaderConnected) {
    statusDotEl.className = "status-dot connected";
    statusTextEl.textContent = readerName || "Reader Connected";
    readerStatusEl.classList.add("connected");
    scanCardEl.classList.add("active");
    presensiScanCardEl.classList.add("active");
    if (currentView === "presensiView" && !eventSelectEl.value) {
      presensiScanTextEl.innerHTML = `
        <h2 style="color: var(--warning)">Pilih Event</h2>
        <p>Tentukan event di dropdown atas</p>
      `;
    } else {
      presensiScanTextEl.innerHTML = `
        <h2>Siap Membaca</h2>
        <p>Tempelkan kartu peserta ke reader</p>
      `;
    }
  } else {
    statusDotEl.className = "status-dot disconnected";
    statusTextEl.textContent = "Reader Terputus";
    readerStatusEl.classList.remove("connected");
    scanCardEl.classList.remove("active");
    scanCardEl.classList.remove("detected");
    presensiScanCardEl.classList.remove("active");
    presensiScanCardEl.classList.remove("detected");
    scanTextEl.innerHTML = `
      <h2>Tempelkan Kartu NFC</h2>
      <p>Dekatkan kartu ke reader ACR122U</p>
    `;
    presensiScanTextEl.innerHTML = `
      <h2>Menunggu Reader...</h2>
      <p>Hubungkan reader ACR122U</p>
    `;
  }
}

function showCardDetected(cardData, isSilent = false) {
  // Update scan card state
  scanCardEl.classList.remove("active");
  scanCardEl.classList.add("detected");

  // Show card info panel
  cardInfoEl.classList.remove("hidden");
  ndefRecordsEl.classList.remove("hidden");

  // Show name in the circle if available
  const vcard = cardData.ndefRecords?.find(
    (r) => r && r.recordType === "vcard",
  );
  if (vcard && vcard.fullName) {
    scanTextEl.innerHTML = `<h2>${vcard.fullName}</h2>`;
  }

  // Display NDEF data (vCard, URI, Text)
  displayNDEFRecords(cardData.ndefRecords);

  if (!isSilent) {
    // Add to history
    addToHistory(cardData);
    // Play subtle feedback
    playDetectSound();
  }
}

function showCardRemoved() {
  if (isReaderConnected) {
    // Reset Cek Kartu view
    scanCardEl.classList.remove("detected");
    scanCardEl.classList.add("active");
    scanTextEl.innerHTML = `
      <h2>Siap Membaca</h2>
      <p>Tempelkan kartu NFC ke reader</p>
    `;
    cardInfoEl.classList.add("hidden");

    // Reset Presensi view
    presensiScanCardEl.classList.remove("detected");
    presensiScanCardEl.classList.add("active");
    presensiScanTextEl.innerHTML = `
      <h2>Siap Membaca</h2>
      <p>Tempelkan kartu peserta ke reader</p>
    `;
    presensiResultInfoEl.classList.add("hidden");
    isSubmitting = false;
  }
}

function addToHistory(cardData) {
  scanHistory.unshift(cardData);
  if (scanHistory.length > 50) {
    scanHistory.pop();
  }
  renderHistory();
}

function renderHistory() {
  if (scanHistory.length === 0) {
    historyEmptyEl.classList.remove("hidden");
    const items = historyListEl.querySelectorAll(".history-item");
    items.forEach((item) => item.remove());
    return;
  }

  historyEmptyEl.classList.add("hidden");

  const existingItems = historyListEl.querySelectorAll(".history-item");
  existingItems.forEach((item) => item.remove());

  scanHistory.forEach((card, index) => {
    const itemEl = document.createElement("div");
    itemEl.className = "history-item";

    // Determine display label
    const vcard = card.ndefRecords?.find((r) => r && r.recordType === "vcard");
    const label = vcard ? vcard.fullName : formatUID(card.uid);
    const sublabel = vcard ? vcard.organization || formatUID(card.uid) : "";

    itemEl.innerHTML = `
      <div class="history-item-icon">${vcard ? getInitials(vcard.fullName) : "💳"}</div>
      <div class="history-item-info">
        <div class="history-item-uid">${label}</div>
        <div class="history-item-time">${sublabel ? sublabel + " • " : ""}${formatTime(card.timestamp)}</div>
      </div>
      <div class="history-item-badge">${vcard ? "vCard" : "OK"}</div>
    `;

    historyListEl.appendChild(itemEl);
  });
}

function showError(message) {
  if (toastTimeout) clearTimeout(toastTimeout);

  errorTextEl.textContent = message;
  errorIconEl.textContent = "⚠️";
  errorToastEl.className = "toast error";
  errorToastEl.classList.remove("hidden");

  toastTimeout = setTimeout(() => {
    errorToastEl.classList.add("hidden");
  }, 5000);
}

function playDetectSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.3,
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    // Audio not available
  }
}

// ===== Event Listeners =====
btnClearEl.addEventListener("click", () => {
  scanHistory = [];
  renderHistory();
});

// ===== NFC API Listeners =====
if (window.nfcAPI) {
  window.nfcAPI.onReaderStatus((data) => {
    console.log("[Renderer] Reader status:", data);
    updateReaderStatus(data.status, data.readerName);
  });

  async function handlePresensiDetected(cardData) {
    if (isSubmitting) return;

    if (!navigator.onLine) {
      showError("Koneksi terputus! Presensi memerlukan internet.");
      return;
    }

    const eventId = eventSelectEl.value;
    if (!eventId) {
      showError("Silakan pilih Event terlebih dahulu dari dropdown");
      return;
    }

    // Find Agent ID and Branch Code from Text Record
    let agentId = null;
    let branchCode = null;
    let agentName = "Unknown";
    let branchName = "-";

    const hasVCard = cardData.ndefRecords?.some(
      (r) => r && r.recordType === "vcard",
    );
    if (hasVCard) {
      const vcard = cardData.ndefRecords.find((r) => r.recordType === "vcard");
      agentName = vcard?.fullName || "Unknown";
      branchName = vcard?.organization || "-";
    }

    const textRecord = cardData.ndefRecords?.find(
      (r) => r && r.recordType === "text",
    );
    if (textRecord) {
      const rawText = textRecord.text || "";
      if (rawText.includes(";")) {
        const parts = rawText.split(";");
        agentId = parts[0]?.trim();
        branchCode = parts[1]?.trim();
      } else if (rawText.includes(",")) {
        const parts = rawText.split(",");
        agentId = parts[0]?.trim();
        branchCode = parts[1]?.trim();
      } else {
        agentId = rawText;
      }
    }

    if (!agentId || !branchCode || agentId === "-" || branchCode === "-") {
      showError("Kartu tidak memiliki data Agent ID & Branch Code yang valid");
      return;
    }

    // Update UI to Processing
    isSubmitting = true;
    presensiScanCardEl.classList.remove("active");
    presensiScanCardEl.classList.add("detected");
    presensiScanTextEl.innerHTML = `
    <h2>Memproses...</h2>
    <p>Mohon tahan kartu sebentar</p>
  `;

    try {
      const response = await submitPresenceApi(agentId, branchCode, eventId);

      // API returns { success: bool, message: string } based on Dart model
      if (response && response.success) {
        // Show Success UI
        presensiResultInfoEl.classList.remove("hidden");
        presensiStatusBoxEl.className = "presensi-status-box success";
        presensiStatusBoxEl.style.background = "var(--success-glow)";
        presensiStatusBoxEl.style.color = "var(--success)";
        presensiStatusBoxEl.style.border = "1px solid rgba(16, 185, 129, 0.3)";
        presensiStatusBoxEl.textContent =
          "✔ " + (response.message || "Presensi Berhasil");

        presensiAgentNameEl.textContent = agentName;
        presensiBranchNameEl.textContent = branchName;
        presensiTimeEl.textContent = formatTime(new Date().toISOString());
        presensiAgentIdEl.textContent = agentId;
        presensiBranchCodeEl.textContent = branchCode;

        presensiScanTextEl.innerHTML = `<h2>Terkonfirmasi</h2>`;
        playDetectSound();

        // Refresh the presence list to show the new participant
        loadPresenceList(eventId);
      } else {
        // Server returned success: false
        presensiResultInfoEl.classList.remove("hidden");
        presensiStatusBoxEl.className = "presensi-status-box error";
        presensiStatusBoxEl.style.background = "rgba(239, 68, 68, 0.15)";
        presensiStatusBoxEl.style.color = "var(--danger)";
        presensiStatusBoxEl.style.border = "1px solid rgba(239, 68, 68, 0.3)";
        presensiStatusBoxEl.textContent =
          "❌ " + (response?.message || "Presensi Gagal");

        presensiAgentNameEl.textContent = agentName;
        presensiBranchNameEl.textContent = branchName;
        presensiTimeEl.textContent = "-";
        presensiAgentIdEl.textContent = agentId;
        presensiBranchCodeEl.textContent = branchCode;

        presensiScanTextEl.innerHTML = `<h2>Gagal Presensi</h2>`;
      }
    } catch (error) {
      // Network / fetch error
      presensiResultInfoEl.classList.remove("hidden");
      presensiStatusBoxEl.className = "presensi-status-box error";
      presensiStatusBoxEl.style.background = "rgba(239, 68, 68, 0.15)";
      presensiStatusBoxEl.style.color = "var(--danger)";
      presensiStatusBoxEl.style.border = "1px solid rgba(239, 68, 68, 0.3)";
      presensiStatusBoxEl.textContent = "❌ Gagal: " + error.message;

      presensiAgentNameEl.textContent = agentName;
      presensiTimeEl.textContent = "-";
      presensiAgentIdEl.textContent = agentId;
      presensiBranchCodeEl.textContent = branchCode;

      presensiScanTextEl.innerHTML = `<h2>Gagal Presensi</h2>`;
    } finally {
      isSubmitting = false;
    }
  }

  window.nfcAPI.onCardDetected((data) => {
    console.log("[Renderer] Card detected:", data);
    currentCardData = data;
    if (currentView === "cekKartuView") {
      showCardDetected(data);
    } else if (currentView === "presensiView") {
      handlePresensiDetected(data);
    } else if (currentView === "isiKartuView") {
      autoPopulateWriteForm(data);
    }
  });

  window.nfcAPI.onCardRemoved((data) => {
    console.log("[Renderer] Card removed:", data);
    currentCardData = null;
    showCardRemoved();
  });

  window.nfcAPI.onError((data) => {
    console.error("[Renderer] NFC Error:", data);
    showError(data.message);
  });
} else {
  console.warn("[Renderer] nfcAPI not available");
  statusTextEl.textContent = "NFC API tidak tersedia";
}

// ===== Write Card Logic =====
function setupWriteForm() {
  const writeForm = document.getElementById("writeCardForm");
  const btnWrite = document.getElementById("btnWriteCard");
  const btnExport = document.getElementById("btnExportJson");
  const btnImport = document.getElementById("btnImportJson");

  if (!writeForm) return;

  // Export JSON
  btnExport.addEventListener("click", async () => {
    const data = {
      fullName: document.getElementById("writeFullName").value,
      org: document.getElementById("writeOrg").value,
      phone: document.getElementById("writePhone").value,
      email: document.getElementById("writeEmail").value,
      vcardUrl: document.getElementById("writeVCardUrl").value,
      agentId: document.getElementById("writeAgentId").value,
      branchCode: document.getElementById("writeBranchCode").value,
      uri: document.getElementById("writeUri").value,
    };

    const result = await window.nfcAPI.exportJson(data);
    if (result.success) {
      showSuccess("Data berhasil diekspor!");
    }
  });

  // Import JSON
  btnImport.addEventListener("click", async () => {
    const result = await window.nfcAPI.importJson();
    if (result.success && result.data) {
      const d = result.data;
      document.getElementById("writeFullName").value = d.fullName || "";
      // Strip "PropNex" if it exists in the imported org data
      let orgVal = d.org || "";
      orgVal = orgVal.replace(/^PropNex\s*/i, "").trim();
      document.getElementById("writeOrg").value = orgVal;

      document.getElementById("writePhone").value = (d.phone || "").replace(
        "+62",
        "",
      );
      document.getElementById("writeEmail").value = d.email || "";
      document.getElementById("writeVCardUrl").value = d.vcardUrl || "";
      document.getElementById("writeAgentId").value = d.agentId || "";
      document.getElementById("writeBranchCode").value = d.branchCode || "";
      document.getElementById("writeUri").value = d.uri || "";
      showSuccess("Data berhasil diimpor!");
    }
  });

  // Auto-URL Generation Logic
  const nameInput = document.getElementById("writeFullName");
  const orgInput = document.getElementById("writeOrg");
  const vcardUrlInput = document.getElementById("writeVCardUrl");
  const contactUriInput = document.getElementById("writeUri");

  const updateUrls = () => {
    const name = nameInput.value.trim().toLowerCase().replace(/\s+/g, "_");
    const orgRaw = orgInput.value.trim().toLowerCase();
    // Prefix is already handled in UI, so orgRaw is just the branch name
    const org = orgRaw.replace(/\s+/g, "_");

    if (name && org) {
      const baseUrl = `https://propnexplus.com/${org}/${name}`;
      vcardUrlInput.value = baseUrl;
      contactUriInput.value = `${baseUrl}/contact-detail`;
    }
  };

  nameInput.addEventListener("input", updateUrls);
  orgInput.addEventListener("input", updateUrls);

  writeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isReaderConnected) {
      showError("Hubungkan reader terlebih dahulu.");
      return;
    }

    if (!currentCardData) {
      showError("Tempelkan kartu NFC ke reader.");
      return;
    }

    const fullName = document.getElementById("writeFullName").value;
    const orgValue = document.getElementById("writeOrg").value;
    const org = orgValue
      ? `PropNex ${orgValue.replace(/^PropNex\s*/i, "").trim()}`
      : "PropNex Indonesia";
    const phoneValue = document.getElementById("writePhone").value;
    const phone = phoneValue ? `+62${phoneValue.replace(/^\+62/, "")}` : "";
    const email = document.getElementById("writeEmail").value;
    const vcardUrl = document.getElementById("writeVCardUrl").value;
    const agentId = document.getElementById("writeAgentId").value;
    const branchCode = document.getElementById("writeBranchCode").value;
    const customUri = document.getElementById("writeUri").value;

    // Construct vCard string
    let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${fullName}\nORG:${org}\n`;
    if (phone) vcard += `TEL:${phone}\n`;
    if (email) vcard += `EMAIL:${email}\n`;
    if (vcardUrl) vcard += `URL:${vcardUrl}\n`;
    vcard += `END:VCARD`;

    const writeData = {
      vcard,
      agentInfo: `${agentId};${branchCode}`,
      uri: customUri || null,
    };

    try {
      btnWrite.disabled = true;
      btnWrite.classList.add("writing");
      btnWrite.innerHTML = `<span class="btn-icon">⏳</span> Menulis...`;

      const result = await window.nfcAPI.writeCard(writeData);

      if (result.success) {
        showSuccess(result.message || "Kartu berhasil diisi!");
        // Refresh card data immediately and also after a short delay
        // to ensure currentCardData is perfectly in sync for other tabs
        refreshCurrentCard(true); // Silent update of global state
        setTimeout(() => refreshCurrentCard(true), 500);
      }
    } catch (err) {
      showError(err.message || "Gagal menulis ke kartu.");
    } finally {
      btnWrite.disabled = false;
      btnWrite.classList.remove("writing");
      btnWrite.innerHTML = `<span class="btn-icon">💾</span> Isi Data ke Kartu`;
    }
  });
}

async function refreshCurrentCard(isSilent = false) {
  try {
    const result = await window.nfcAPI.readCard();
    console.log("[Renderer] Manual refresh result:", result);

    if (result && result.success && result.card) {
      currentCardData = result.card;
      console.log(
        "[Renderer] Updated currentCardData after refresh:",
        currentCardData,
      );

      if (currentView === "cekKartuView") {
        showCardDetected(currentCardData, isSilent);
      } else if (currentView === "presensiView") {
        handlePresensiDetected(currentCardData, isSilent);
      } else if (currentView === "isiKartuView") {
        autoPopulateWriteForm(currentCardData, false); // false = don't show success toast again
      }
    } else {
      // If not silent or if we were explicitly told no card
      if (!isSilent) {
        currentCardData = null;
        showCardRemoved();
      }
    }
  } catch (err) {
    console.error("[Renderer] Error refreshing card:", err);
  }
}

function autoPopulateWriteForm(cardData, showToast = true) {
  if (!cardData || !cardData.ndefRecords) return;

  const records = cardData.ndefRecords;
  const vcard = records.find((r) => r && r.recordType === "vcard");
  const uri = records.find((r) => r && r.recordType === "uri");
  const text = records.find((r) => r && r.recordType === "text");

  // Populate VCard fields
  if (vcard) {
    if (vcard.fullName)
      document.getElementById("writeFullName").value = vcard.fullName;
    if (vcard.organization) {
      // Strip "PropNex" prefix for UI
      const org = vcard.organization.replace(/^PropNex\s*/i, "").trim();
      document.getElementById("writeOrg").value = org;
    }
    if (vcard.phone) {
      // Strip "+62" for UI
      const phone = vcard.phone.replace(/^\+62/, "");
      document.getElementById("writePhone").value = phone;
    }
    if (vcard.email) document.getElementById("writeEmail").value = vcard.email;
    if (vcard.url) document.getElementById("writeVCardUrl").value = vcard.url;
  }

  // Populate URI field
  if (uri && uri.uri) {
    document.getElementById("writeUri").value = uri.uri;
  }

  // Populate Agent Info fields
  if (text && text.text) {
    const rawText = text.text;
    let agentId = "";
    let branchCode = "";

    if (rawText.includes(";")) {
      const parts = rawText.split(";");
      agentId = parts[0]?.trim() || "";
      branchCode = parts[1]?.trim() || "";
    } else if (rawText.includes(",")) {
      const parts = rawText.split(",");
      agentId = parts[0]?.trim() || "";
      branchCode = parts[1]?.trim() || "";
    } else {
      agentId = rawText;
    }

    if (agentId) document.getElementById("writeAgentId").value = agentId;
    if (branchCode)
      document.getElementById("writeBranchCode").value = branchCode;
  }
}

function showSuccess(message) {
  if (toastTimeout) clearTimeout(toastTimeout);

  errorTextEl.textContent = message;
  errorIconEl.textContent = "✅";
  errorToastEl.className = "toast success";
  errorToastEl.classList.remove("hidden");

  toastTimeout = setTimeout(() => {
    errorToastEl.classList.add("hidden");
  }, 5000);
}

// ===== Initialize =====
renderHistory();
setupWriteForm();
initApp();
