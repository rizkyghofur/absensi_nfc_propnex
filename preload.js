const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("nfcAPI", {
  // Open external URL
  openExternal: (url) => ipcRenderer.send("app:open-external", url),

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
