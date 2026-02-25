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

// ===== State =====
let scanHistory = [];
let isReaderConnected = false;
let toastTimeout = null;

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
    scanTextEl.innerHTML = `
      <h2>Siap Membaca</h2>
      <p>Tempelkan kartu NFC ke reader</p>
    `;
  } else {
    statusDotEl.className = "status-dot disconnected";
    statusTextEl.textContent = "Reader Terputus";
    readerStatusEl.classList.remove("connected");
    scanCardEl.classList.remove("active");
    scanCardEl.classList.remove("detected");
    scanTextEl.innerHTML = `
      <h2>Tempelkan Kartu NFC</h2>
      <p>Dekatkan kartu ke reader ACR122U</p>
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
    scanCardEl.classList.remove("detected");
    scanCardEl.classList.add("active");
    scanTextEl.innerHTML = `
      <h2>Siap Membaca</h2>
      <p>Tempelkan kartu NFC ke reader</p>
    `;
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

  window.nfcAPI.onCardDetected((data) => {
    console.log("[Renderer] Card detected:", data);
    showCardDetected(data);
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
