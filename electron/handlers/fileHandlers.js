import { dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import store from "../store.js";
import { Buffer } from "buffer";

// Get saved paths from store
let savedPaths = store.get("paths");

// Font adını dosyadan al
const getFontFamily = (fontFileName) => {
  // Dosya uzantısını kaldır (.ttf, .otf, .woff, .woff2)
  const baseName = fontFileName
    .replace(/\.(ttf|otf|woff|woff2)$/i, "")
    .replace(/[\s-]+/g, "") // Boşluk ve tire karakterlerini kaldır
    .replace(/([A-Z])/g, "$1"); // Büyük harfleri koru

  return {
    family: baseName,
    file: fontFileName,
  };
};

// Get Excel columns
async function getExcelColumns() {
  try {
    const activeExcel = store.get("activeExcelFile");
    if (!activeExcel) return [];

    const excelBuffer = await fs.readFile(activeExcel);
    const workbook = XLSX.read(excelBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) return [];

    return Object.keys(data[0]);
  } catch (error) {
    console.error("Could not get Excel columns:", error);
    return [];
  }
}

export const registerFileHandlers = (ipcMain, app) => {
  // Get Excel columns
  ipcMain.handle("get-excel-columns", async () => {
    return await getExcelColumns();
  });

  // Select Excel file
  ipcMain.handle("select-excel", async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: "Select Excel File",
      filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
      properties: ["openFile"],
    });

    if (filePaths && filePaths.length > 0) {
      // Get current imagePositions
      const currentPositions = store.get("imagePositions") || {};
      const newExcelPath = filePaths[0];
      const excelFileName = path.basename(newExcelPath);
      const oldExcelFileName = path.basename(savedPaths.excelPath || "");

      // If this Excel file doesn't have positions yet, copy from the previous Excel file if exists
      if (!currentPositions[excelFileName]) {
        if (oldExcelFileName && currentPositions[oldExcelFileName]) {
          currentPositions[excelFileName] = JSON.parse(
            JSON.stringify(currentPositions[oldExcelFileName]),
          );
        } else {
          currentPositions[excelFileName] = {};
        }
        store.set("imagePositions", currentPositions);
      }

      savedPaths.excelPath = newExcelPath;
      store.set("paths", savedPaths);
      return { path: newExcelPath };
    }
    return { path: null };
  });

  // Select image folder
  ipcMain.handle("select-image-folder", async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: "Select Image Folder",
      properties: ["openDirectory"],
    });

    if (filePaths && filePaths.length > 0) {
      savedPaths.imagePath = filePaths[0];
      store.set("paths", savedPaths); // Save to store
      return { path: filePaths[0] };
    }
    return { path: null };
  });

  // Select output folder
  ipcMain.handle("select-output", async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: "Select Output Folder",
      defaultPath:
        savedPaths.outputDir ||
        path.join(app.getPath("pictures"), "Excel-Images"),
      properties: ["openDirectory", "createDirectory"],
    });

    if (filePaths && filePaths.length > 0) {
      savedPaths.outputDir = filePaths[0];
      store.set("paths", savedPaths); // Save to store
      return { path: filePaths[0] };
    }
    return { path: null };
  });

  // Get saved paths
  ipcMain.handle("get-saved-paths", () => {
    return store.get("paths"); // Read from store
  });

  // Reset paths handler
  ipcMain.handle("reset-paths", () => {
    savedPaths = {
      excelFolderPath: "",
      imagePath: "",
      outputDir: "",
      fontPath: "",
    };
    store.set("paths", savedPaths);
    store.set("activeExcelFile", "");
    return savedPaths;
  });

  // Get image positions
  ipcMain.handle("get-image-positions", () => {
    return store.get("imagePositions");
  });

  // Save image positions
  ipcMain.handle("save-image-positions", (event, positions) => {
    const allPositions = store.get("imagePositions") || {};
    const activeExcel = store.get("activeExcelFile");
    const currentExcelFileName = path.basename(activeExcel);
    allPositions[currentExcelFileName] = positions[currentExcelFileName];
    store.set("imagePositions", allPositions);
    return true;
  });

  // Get image list
  ipcMain.handle("get-image-list", async () => {
    try {
      const files = await fs.readdir(savedPaths.imagePath);
      return files.filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file));
    } catch {
      return [];
    }
  });

  // Select font folder
  ipcMain.handle("select-font-folder", async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: "Select Font Folder",
      properties: ["openDirectory"],
      filters: [{ name: "Fonts", extensions: ["ttf", "otf", "woff", "woff2"] }],
    });

    if (filePaths && filePaths.length > 0) {
      savedPaths.fontPath = filePaths[0];
      store.set("paths", savedPaths);
      return { path: filePaths[0] };
    }
    return { path: null };
  });

  // Get font list
  ipcMain.handle("get-font-list", async () => {
    try {
      if (!savedPaths.fontPath) return [];

      const files = await fs.readdir(savedPaths.fontPath);
      // Sadece font dosyalarını filtrele
      const fontFiles = files.filter((file) =>
        /\.(ttf|otf|woff|woff2)$/i.test(file),
      );

      // Font bilgilerini döndür
      return fontFiles.map((file) => {
        const fontInfo = getFontFamily(file);
        return {
          fileName: file,
          displayName: fontInfo.family,
        };
      });
    } catch (error) {
      console.error("Could not get font list:", error);
      return [];
    }
  });

  // Get Excel data
  ipcMain.handle("get-excel-data", async () => {
    try {
      const activeExcel = store.get("activeExcelFile");
      if (!activeExcel) return [];

      const excelBuffer = await fs.readFile(activeExcel);
      const workbook = XLSX.read(excelBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
      console.error("Could not get Excel data:", error);
      return [];
    }
  });

  // Select Excel folder
  ipcMain.handle("select-excel-folder", async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: "Select Excel Files Folder",
      properties: ["openDirectory"],
    });

    if (filePaths && filePaths.length > 0) {
      savedPaths.excelFolderPath = filePaths[0];
      store.set("paths", savedPaths);
      return { path: filePaths[0] };
    }
    return { path: null };
  });

  // Get Excel files from folder
  ipcMain.handle("get-excel-files", async () => {
    try {
      if (!savedPaths.excelFolderPath) return [];

      const files = await fs.readdir(savedPaths.excelFolderPath);
      return files
        .filter((file) => file.endsWith(".xlsx") || file.endsWith(".xls"))
        .map((file) => ({
          name: file,
          path: path.join(savedPaths.excelFolderPath, file),
        }));
    } catch (error) {
      console.error("Could not get Excel files:", error);
      return [];
    }
  });

  // Select specific Excel file from folder
  ipcMain.handle("select-excel-file", async (event, filePath) => {
    try {
      store.set("activeExcelFile", filePath);
      return { path: filePath };
    } catch (error) {
      console.error("Error selecting Excel file:", error);
      return { path: null };
    }
  });

  // Get active Excel file
  ipcMain.handle("get-active-excel", () => {
    return store.get("activeExcelFile");
  });

  // Set active Excel file
  ipcMain.handle("set-active-excel", (event, filePath) => {
    store.set("activeExcelFile", filePath);
    return true;
  });

  // Get image preview
  ipcMain.handle("get-image-preview", async (event, imageName) => {
    try {
      if (!savedPaths.imagePath || !imageName) return null;

      const imagePath = path.join(savedPaths.imagePath, imageName);
      const imageBuffer = await fs.readFile(imagePath);

      return `data:image/png;base64,${imageBuffer.toString("base64")}`;
    } catch (error) {
      console.error("Error getting image preview:", error);
      return null;
    }
  });

  // Get font family
  ipcMain.handle("get-font-family", async (event, fontFileName) => {
    try {
      return getFontFamily(fontFileName);
    } catch (error) {
      console.error("Error getting font family:", error);
      return { family: "Arial" };
    }
  });

  // Get font path
  ipcMain.handle("get-font-path", async (event, fontFileName) => {
    try {
      if (!savedPaths.fontPath || !fontFileName) return null;
      const fontPath = path.join(savedPaths.fontPath, fontFileName);

      // Önce dosyanın varlığını kontrol et
      try {
        await fs.access(fontPath);
        console.log("Font file exists:", fontPath);
      } catch {
        console.error("Font file not found:", fontPath);
        return null;
      }

      // Fontu oku ve base64'e çevir
      const fontBuffer = await fs.readFile(fontPath);
      const base64Font = fontBuffer.toString("base64");

      // Font tipini belirle
      const fontExtension = path.extname(fontFileName).slice(1).toLowerCase();
      let mimeType = "application/x-font-ttf"; // TTF için daha uygun MIME type
      if (fontExtension === "otf") mimeType = "application/x-font-opentype";
      else if (fontExtension === "woff") mimeType = "application/font-woff";
      else if (fontExtension === "woff2") mimeType = "application/font-woff2";

      // Data URL'i oluştur
      const dataUrl = `data:${mimeType};base64,${base64Font}`;
      console.log("Font converted to data URL with type:", mimeType);
      return dataUrl;
    } catch (error) {
      console.error("Error getting font path:", error);
      return null;
    }
  });

  // Process Excel and image with previews
  ipcMain.handle(
    "process-excel-and-image-with-previews",
    async (event, previews) => {
      try {
        const outputDir = savedPaths.outputDir;
        const activeExcel = store.get("activeExcelFile");

        if (!outputDir) {
          throw new Error("Output folder not selected");
        }

        if (!activeExcel) {
          throw new Error("Excel file not selected");
        }

        // Create output directory
        await fs.mkdir(outputDir, { recursive: true });

        const results = [];
        const errors = [];

        // Her önizleme için
        for (const [imageName, previewDataUrl] of previews) {
          try {
            // Base64'ten buffer'a çevir
            const base64Data = previewDataUrl.replace(
              /^data:image\/\w+;base64,/,
              "",
            );
            const buffer = Buffer.from(base64Data, "base64");

            // Dosya adını oluştur
            const outputPath = path.join(
              outputDir,
              `${path.basename(activeExcel, ".xlsx")}-${path.basename(
                imageName,
              )}`,
            );

            // Kaydet
            await fs.writeFile(outputPath, buffer);
            results.push(outputPath);
          } catch (error) {
            console.error("Error saving preview:", error);
            errors.push(`${imageName}: ${error.message}`);
          }
        }

        return {
          success: true,
          results,
          errors,
          saveDir: outputDir,
        };
      } catch (error) {
        console.error("Processing error:", error);
        return { success: false, error: error.message };
      }
    },
  );

  // Output dosyalarını listele
  ipcMain.handle("get-output-files", async () => {
    try {
      const outputPath = savedPaths.outputDir;
      if (!outputPath) return [];

      const files = await fs.readdir(outputPath);
      return files.filter((file) => file.match(/\.(jpg|jpeg|png)$/i));
    } catch (error) {
      console.error("Error reading output directory:", error);
      return [];
    }
  });

  // Output dosyasının önizlemesini al
  ipcMain.handle("get-output-preview", async (event, filename) => {
    try {
      const outputPath = savedPaths.outputDir;
      if (!outputPath) return null;

      const filePath = path.join(outputPath, filename);
      const data = await fs.readFile(filePath);
      return `data:image/png;base64,${data.toString("base64")}`;
    } catch (error) {
      console.error("Error reading output file:", error);
      return null;
    }
  });
};
