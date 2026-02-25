const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let mainWindow;
let nfc;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 700,
    minHeight: 550,
    title: "PropNex NFC Attendance System",
    icon: path.join(__dirname, "assets", "icon.png"),
    backgroundColor: "#0f0f1a",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ===== NDEF Parsing =====

/**
 * Parse NDEF message from raw bytes (NTAG/MIFARE memory dump).
 * Reads TLV blocks to find NDEF Message TLV (type 0x03).
 */
function parseNDEFFromMemory(data) {
  const records = [];
  let i = 0;

  // Skip any leading null bytes or capability container
  // Find NDEF Message TLV (Type = 0x03)
  while (i < data.length) {
    const type = data[i];

    if (type === 0x00) {
      // NULL TLV - skip
      i++;
      continue;
    }

    if (type === 0xfe) {
      // Terminator TLV
      break;
    }

    if (type === 0x03) {
      // NDEF Message TLV
      i++;
      let ndefLength = data[i];
      i++;

      if (ndefLength === 0xff) {
        // 3-byte length format
        ndefLength = (data[i] << 8) | data[i + 1];
        i += 2;
      }

      const ndefMessage = data.slice(i, i + ndefLength);
      const parsed = parseNDEFMessage(ndefMessage);
      records.push(...parsed);
      i += ndefLength;
    } else {
      // Other TLV - skip
      i++;
      let len = data[i];
      i++;
      if (len === 0xff) {
        len = (data[i] << 8) | data[i + 1];
        i += 2;
      }
      i += len;
    }
  }

  return records;
}

/**
 * Parse NDEF Message into individual records.
 */
function parseNDEFMessage(data) {
  const records = [];
  let offset = 0;

  while (offset < data.length) {
    const header = data[offset];
    offset++;

    const mb = (header & 0x80) !== 0; // Message Begin
    const me = (header & 0x40) !== 0; // Message End
    const cf = (header & 0x20) !== 0; // Chunk Flag
    const sr = (header & 0x10) !== 0; // Short Record
    const il = (header & 0x08) !== 0; // ID Length present
    const tnf = header & 0x07; // Type Name Format

    const typeLength = data[offset];
    offset++;

    let payloadLength;
    if (sr) {
      payloadLength = data[offset];
      offset++;
    } else {
      payloadLength =
        (data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3];
      offset += 4;
    }

    let idLength = 0;
    if (il) {
      idLength = data[offset];
      offset++;
    }

    const type = data.slice(offset, offset + typeLength);
    offset += typeLength;

    let id = null;
    if (idLength > 0) {
      id = data.slice(offset, offset + idLength);
      offset += idLength;
    }

    const payload = data.slice(offset, offset + payloadLength);
    offset += payloadLength;

    const record = {
      tnf,
      type: Buffer.from(type).toString("ascii"),
      payload: Buffer.from(payload),
      id: id ? Buffer.from(id).toString("ascii") : null,
    };

    // Decode based on TNF and type
    record.decoded = decodeNDEFRecord(record);
    records.push(record);

    if (me) break;
  }

  return records;
}

/**
 * Decode NDEF record payload based on TNF and type.
 */
function decodeNDEFRecord(record) {
  const { tnf, type, payload } = record;

  // TNF 0x01 = NFC Forum well-known type
  if (tnf === 0x01) {
    if (type === "T") {
      // Text record
      const statusByte = payload[0];
      const langLength = statusByte & 0x3f;
      const encoding = (statusByte & 0x80) === 0 ? "utf-8" : "utf-16";
      const language = payload.slice(1, 1 + langLength).toString("ascii");
      const text = payload
        .slice(1 + langLength)
        .toString(encoding === "utf-8" ? "utf8" : "utf16le");
      return { recordType: "text", language, text, encoding };
    }

    if (type === "U") {
      // URI record
      const prefixes = [
        "",
        "http://www.",
        "https://www.",
        "http://",
        "https://",
        "tel:",
        "mailto:",
        "ftp://anonymous:anonymous@",
        "ftp://ftp.",
        "ftps://",
        "sftp://",
        "smb://",
        "nfs://",
        "ftp://",
        "dav://",
        "news:",
        "telnet://",
        "imap:",
        "rtsp://",
        "urn:",
        "pop:",
        "sip:",
        "sips:",
        "tftp:",
        "btspp://",
        "btl2cap://",
        "btgoep://",
        "tcpobex://",
        "irdaobex://",
        "file://",
        "urn:epc:id:",
        "urn:epc:tag:",
        "urn:epc:pat:",
        "urn:epc:raw:",
        "urn:epc:",
        "urn:nfc:",
      ];
      const prefixIndex = payload[0];
      const prefix = prefixes[prefixIndex] || "";
      const uri = prefix + payload.slice(1).toString("utf8");
      return { recordType: "uri", uri };
    }
  }

  // TNF 0x02 = Media type (RFC 2046)
  if (tnf === 0x02) {
    if (
      type.toLowerCase().includes("vcard") ||
      type.toLowerCase() === "text/vcard" ||
      type.toLowerCase() === "text/x-vcard"
    ) {
      const vcardText = payload.toString("utf8");
      const parsed = parseVCard(vcardText);
      return { recordType: "vcard", raw: vcardText, ...parsed };
    }

    // Generic media type
    return {
      recordType: "media",
      mediaType: type,
      data: payload.toString("utf8"),
    };
  }

  // TNF 0x04 = External type
  if (tnf === 0x04) {
    return { recordType: "external", type, data: payload.toString("utf8") };
  }

  // Fallback
  return {
    recordType: "unknown",
    tnf,
    type,
    rawHex: payload.toString("hex"),
    rawText: payload.toString("utf8"),
  };
}

/**
 * Parse vCard text into structured data.
 */
function parseVCard(text) {
  const result = {
    fullName: null,
    organization: null,
    phone: null,
    email: null,
    url: null,
    title: null,
    address: null,
    note: null,
    raw: text,
  };

  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    const keyUpper = key.toUpperCase().split(";")[0]; // Handle params like TEL;TYPE=WORK

    switch (keyUpper) {
      case "FN":
        result.fullName = value;
        break;
      case "ORG":
        result.organization = value;
        break;
      case "TEL":
        result.phone = value;
        break;
      case "EMAIL":
        result.email = value;
        break;
      case "URL":
        result.url = value;
        break;
      case "TITLE":
        result.title = value;
        break;
      case "ADR":
        result.address = value.replace(/;/g, ", ");
        break;
      case "NOTE":
        result.note = value;
        break;
    }
  }

  return result;
}

// ===== NFC Reader Logic =====

/**
 * Read all data pages from NTAG/MIFARE Ultralight card.
 * NTAG213 = 45 pages (4 bytes each), NTAG215 = 135, NTAG216 = 231
 * User data starts at page 4.
 */
async function readNDEFData(reader) {
  try {
    // Try reading blocks starting from page 4 (user data area)
    // Read in chunks of 4 pages (16 bytes) at a time
    const chunks = [];
    const maxPages = 140; // Cover NTAG215 and below

    for (let page = 4; page < maxPages; page += 4) {
      try {
        // READ command for NTAG: reads 4 pages (16 bytes) from given page
        const cmd = Buffer.from([0xff, 0xb0, 0x00, page, 0x10]);
        const response = await reader.transmit(cmd, 18);

        if (response.length >= 2) {
          const sw = response.slice(response.length - 2);
          if (sw[0] === 0x90 && sw[1] === 0x00) {
            chunks.push(response.slice(0, response.length - 2));
          } else {
            // Read failed at this page, we've probably reached the end
            break;
          }
        } else {
          break;
        }
      } catch (readErr) {
        // End of readable area
        break;
      }
    }

    if (chunks.length === 0) {
      return null;
    }

    const fullData = Buffer.concat(chunks);
    const records = parseNDEFFromMemory(fullData);
    return records;
  } catch (err) {
    console.error("[NFC] Error reading NDEF data:", err.message);
    return null;
  }
}

function initNFC() {
  try {
    const { NFC } = require("nfc-pcsc");
    nfc = new NFC();

    nfc.on("reader", (reader) => {
      console.log(`[NFC] Reader detected: ${reader.reader.name}`);

      // Disable auto-processing so we can read raw data
      reader.autoProcessing = false;

      if (mainWindow) {
        mainWindow.webContents.send("nfc:reader-status", {
          status: "connected",
          readerName: reader.reader.name,
        });
      }

      reader.on("card", async (card) => {
        console.log(
          `[NFC] Card detected - UID: ${card.uid || "unknown"}, ATR: ${card.atr ? card.atr.toString("hex") : "none"}`,
        );

        const cardData = {
          uid: card.uid || null,
          atr: card.atr ? card.atr.toString("hex").toUpperCase() : null,
          standard: card.standard || "Unknown",
          type: card.type || null,
          timestamp: new Date().toISOString(),
          ndefRecords: [],
        };

        // Try to read NDEF data
        try {
          const records = await readNDEFData(reader);
          if (records && records.length > 0) {
            cardData.ndefRecords = records.map((r) => r.decoded);
            console.log(
              `[NFC] NDEF records found:`,
              JSON.stringify(cardData.ndefRecords, null, 2),
            );
          } else {
            console.log("[NFC] No NDEF records found on card");
          }
        } catch (ndefErr) {
          console.error("[NFC] Error reading NDEF:", ndefErr.message);
        }

        if (mainWindow) {
          mainWindow.webContents.send("nfc:card-detected", cardData);
        }
      });

      reader.on("card.off", (card) => {
        console.log(`[NFC] Card removed`);

        if (mainWindow) {
          mainWindow.webContents.send("nfc:card-removed", {
            timestamp: new Date().toISOString(),
          });
        }
      });

      reader.on("error", (err) => {
        console.error(`[NFC] Reader error:`, err);

        if (mainWindow) {
          mainWindow.webContents.send("nfc:error", {
            message: err.message,
            readerName: reader.reader.name,
          });
        }
      });

      reader.on("end", () => {
        console.log(`[NFC] Reader disconnected: ${reader.reader.name}`);

        if (mainWindow) {
          mainWindow.webContents.send("nfc:reader-status", {
            status: "disconnected",
            readerName: reader.reader.name,
          });
        }
      });
    });

    nfc.on("error", (err) => {
      console.error(`[NFC] NFC Error:`, err);

      if (mainWindow) {
        mainWindow.webContents.send("nfc:error", {
          message: err.message,
        });
      }
    });

    console.log("[NFC] NFC module initialized successfully");
  } catch (err) {
    console.error("[NFC] Failed to initialize NFC module:", err.message);

    if (mainWindow) {
      mainWindow.webContents.send("nfc:error", {
        message: "NFC module gagal dimuat: " + err.message,
      });
    }
  }
}

app.whenReady().then(() => {
  createWindow();
  initNFC();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nfc) {
    try {
      nfc.close();
    } catch (e) {
      // ignore cleanup errors
    }
  }
});
