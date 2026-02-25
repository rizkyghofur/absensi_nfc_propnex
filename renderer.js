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
const presensiTimeEl = document.getElementById("presensiTime");
const presensiAgentIdEl = document.getElementById("presensiAgentId");
const presensiBranchCodeEl = document.getElementById("presensiBranchCode");
const presenceListEl = document.getElementById("presenceList");
const presenceCountEl = document.getElementById("presenceCount");
const presenceEmptyEl = document.getElementById("presenceEmpty");
const agentSearchInputEl = document.getElementById("agentSearchInput");

// ===== API & State =====
const BASE_URL = "https://newapi.propnex.id/api";

let currentView = "cekKartuView";
let scanHistory = [];
let isReaderConnected = false;
let toastTimeout = null;
let isSubmitting = false;
let participantsList = []; // Local storage for searching

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
  });

  agentSearchInputEl.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = participantsList.filter((p) =>
      (p.bizname || "").toLowerCase().includes(query),
    );
    renderPresenceList(filtered, true); // true = skip updating participantsList
  });
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

      // Reset states
      showCardRemoved();
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
  ndefRecordsEl.classList.add("hidden");
  vcardDisplayEl.classList.add("hidden");
  uriDisplayEl.classList.add("hidden");
  textDisplayEl.classList.add("hidden");
  rawDisplayEl.classList.add("hidden");
  vcardPhoneRowEl.classList.add("hidden");
  vcardEmailRowEl.classList.add("hidden");
  vcardUrlRowEl.classList.add("hidden");
}

function displayNDEFRecords(records) {
  resetNDEFDisplay();

  if (!records || records.length === 0) return;

  ndefRecordsEl.classList.remove("hidden");

  for (const record of records) {
    if (!record) continue;

    switch (record.recordType) {
      case "vcard":
        displayVCard(record);
        break;
      case "uri":
        displayURI(record);
        break;
      case "text":
        displayText(record);
        break;
      default:
        displayRaw(record);
        break;
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
  }

  if (data.email) {
    vcardEmailRowEl.classList.remove("hidden");
    vcardEmailEl.textContent = data.email;
  }

  if (data.url) {
    vcardUrlRowEl.classList.remove("hidden");
    vcardUrlEl.textContent = data.url;
  }
}

function displayURI(data) {
  uriDisplayEl.classList.remove("hidden");
  uriValueEl.textContent = data.uri || "-";
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
    scanTextEl.innerHTML = `
      <h2>Siap Membaca</h2>
      <p>Tempelkan kartu NFC ke reader</p>
    `;
    presensiScanTextEl.innerHTML = `
      <h2>Siap Membaca</h2>
      <p>Tempelkan kartu peserta ke reader</p>
    `;
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

function showCardDetected(cardData) {
  // Update scan card state
  scanCardEl.classList.remove("active");
  scanCardEl.classList.add("detected");

  // Check what type of data we got
  const hasVCard = cardData.ndefRecords?.some(
    (r) => r && r.recordType === "vcard",
  );
  const displayName = hasVCard
    ? cardData.ndefRecords.find((r) => r.recordType === "vcard")?.fullName ||
      "Kartu Terbaca!"
    : "Kartu Terbaca!";

  scanTextEl.innerHTML = `
    <h2>${displayName}</h2>
  `;

  // Show card info panel
  cardInfoEl.classList.remove("hidden");

  // Display NDEF data
  displayNDEFRecords(cardData.ndefRecords);

  // Add to history
  addToHistory(cardData);

  // Play subtle feedback
  playDetectSound();
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
  errorTextEl.textContent = message;
  errorToastEl.classList.remove("hidden");

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

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

    const eventId = eventSelectEl.value;
    if (!eventId) {
      showError("Silakan pilih Event terlebih dahulu dari dropdown");
      return;
    }

    // Find Agent ID and Branch Code from Text Record
    let agentId = null;
    let branchCode = null;
    let agentName = "Unknown";

    const hasVCard = cardData.ndefRecords?.some(
      (r) => r && r.recordType === "vcard",
    );
    if (hasVCard) {
      agentName =
        cardData.ndefRecords.find((r) => r.recordType === "vcard")?.fullName ||
        "Unknown";
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
    if (currentView === "cekKartuView") {
      showCardDetected(data);
    } else if (currentView === "presensiView") {
      handlePresensiDetected(data);
    }
  });

  window.nfcAPI.onCardRemoved((data) => {
    console.log("[Renderer] Card removed:", data);
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

// ===== Initialize =====
renderHistory();
initApp();
