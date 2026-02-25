const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nfcAPI", {
  // Listen for card detected
  onCardDetected: (callback) => {
    ipcRenderer.on("nfc:card-detected", (_event, data) => callback(data));
  },

  // Listen for card removed
  onCardRemoved: (callback) => {
    ipcRenderer.on("nfc:card-removed", (_event, data) => callback(data));
  },

  // Listen for reader status changes
  onReaderStatus: (callback) => {
    ipcRenderer.on("nfc:reader-status", (_event, data) => callback(data));
  },

  // Listen for NFC errors
  onError: (callback) => {
    ipcRenderer.on("nfc:error", (_event, data) => callback(data));
  },
});
