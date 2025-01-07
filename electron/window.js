import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createMainWindow() {
  const mainWindow = new BrowserWindow({
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
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // CSP ayarla
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self' 'unsafe-inline' data:;",
            "script-src 'self' 'unsafe-inline';",
            "style-src 'self' 'unsafe-inline';",
            "img-src 'self' data: blob: file:;",
            "font-src 'self' data:;",
          ].join(" "),
        },
      });
    },
  );

  mainWindow.maximize();

  // Load based on development or production mode
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return mainWindow;
}
