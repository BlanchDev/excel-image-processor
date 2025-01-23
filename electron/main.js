import { app, BrowserWindow, ipcMain } from "electron";
import { createMainWindow } from "./window.js";
import { registerFileHandlers } from "./handlers/fileHandlers.js";
import { registerStoreHandlers } from "./store.js";
import process from "process";

app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("disable-gpu-vsync");
app.commandLine.appendSwitch("enable-gpu");
app.commandLine.appendSwitch("enable-gpu-compositing");
app.commandLine.appendSwitch("enable-gpu-driver-compositing");
app.commandLine.appendSwitch("enable-gpu-driver-compositing");
app.commandLine.appendSwitch("enable-hardware-acceleration");
app.commandLine.appendSwitch("ignore-gpu-blacklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=4096");
app.commandLine.appendSwitch("enable-gpu-memory-buffer-video-frames");
app.commandLine.appendSwitch("enable-features", "VaapiVideoDecoder");
app.commandLine.appendSwitch("enable-webgl");
app.commandLine.appendSwitch("enable-accelerated-2d-canvas");

let mainWindow = null;

// Ana pencereyi yönetmek için yardımcı fonksiyon
function handleMainWindow(window) {
  mainWindow = window;
  return mainWindow;
}

app.whenReady().then(() => {
  handleMainWindow(createMainWindow());
  registerFileHandlers(ipcMain, app);
  registerStoreHandlers(ipcMain);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.destroy();
    });
    mainWindow = null;
    app.quit();
  }
});

app.on("before-quit", () => {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  });
  mainWindow = null;
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    handleMainWindow(createMainWindow());
  }
});
