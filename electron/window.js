import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createMainWindow() {
  let mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Excel Image Processor",
    autoHideMenuBar: true,
    center: true,
    paintWhenInitiallyHidden: true,
    backgroundColor: "#262522",
    icon: path.join(__dirname, "../electron/assets/logo.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
      enableAccelerated2dCanvas: true,
      enableHardwareAcceleration: true,
    },
  });

  mainWindow.maximize();

  // Pencere kapatıldığında temizlik işlemleri
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Pencere kapatılmaya çalışıldığında
  mainWindow.on("close", (e) => {
    if (!mainWindow) {
      return;
    }

    e.preventDefault();
    mainWindow.webContents.send("app-closing");
    // Temizlik için biraz bekle
    setTimeout(() => {
      mainWindow.destroy();
    }, 100);
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return mainWindow;
}
