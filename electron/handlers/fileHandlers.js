import { dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import store from "../store.js";
import { createCanvas, loadImage, registerFont } from "canvas";

// Get saved paths from store
let savedPaths = store.get("paths");

// Register all fonts at startup
async function registerAllFonts() {
  if (!savedPaths.fontPath) return;

  try {
    const files = await fs.readdir(savedPaths.fontPath);
    const fontFiles = files.filter((file) =>
      /\.(ttf|otf|woff|woff2)$/i.test(file),
    );

    for (const fontFile of fontFiles) {
      try {
        const fontPath = path.join(savedPaths.fontPath, fontFile);
        const fontInfo = getFontFamily(fontFile);

        console.log(
          "Registering font:",
          fontInfo.family,
          "from file:",
          fontFile,
        );

        // Fontu kaydet
        registerFont(fontPath, {
          family: fontInfo.family,
          style: "normal",
          weight: "normal",
        });
      } catch (error) {
        console.error(`Error registering font ${fontFile}:`, error);
      }
    }
  } catch (error) {
    console.error("Error reading font directory:", error);
  }
}

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

// Find the specified image
async function getImage(basePath, imageName) {
  try {
    const imagePath = path.join(basePath, imageName);
    console.log("Checking image at:", imagePath);

    // Check if file exists
    try {
      await fs.access(imagePath);
      console.log("Image exists at:", imagePath);
    } catch {
      console.error("Image not found at:", imagePath);
      throw new Error(`Image "${imageName}" not found`);
    }

    return {
      path: imagePath,
      fileName: imageName,
    };
  } catch (error) {
    throw new Error(`Error reading image: ${error.message}`);
  }
}

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

export const registerFileHandlers = (ipcMain, app) => {
  // Register all fonts when handlers are initialized
  registerAllFonts();

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
      // Re-register fonts when new folder is selected
      await registerAllFonts();
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

  // Process Excel and image
  ipcMain.handle("process-excel-and-image", async () => {
    try {
      const outputDir = savedPaths.outputDir;
      const activeExcel = store.get("activeExcelFile");

      if (!outputDir) {
        throw new Error("Output folder not selected");
      }

      if (!activeExcel) {
        throw new Error("Excel file not selected");
      }

      if (!savedPaths.imagePath) {
        throw new Error("Image folder not selected");
      }

      // Get current Excel filename
      const excelFileName = path.basename(activeExcel);

      // Read Excel file
      const excelBuffer = await fs.readFile(activeExcel);
      const workbook = XLSX.read(excelBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      const results = [];
      const errors = [];

      // Get saved positions for current Excel
      const allPositions = store.get("imagePositions") || {};
      const positions = allPositions[excelFileName] || {};

      // Process each row
      for (const row of data) {
        try {
          console.log("Processing data:", row);

          // Get image name from img_path column
          const imageName = row["img_path"] || row.img_path;
          if (!imageName) {
            throw new Error("Image name not found in img_path column");
          }

          // Görüntü için pozisyonları al
          const imagePositions = positions[imageName] || {};

          // Aktif sütun var mı kontrol et
          const hasActiveColumns = Object.values(imagePositions).some(
            (col) => col.isEnabled,
          );

          // Eğer hiç aktif sütun yoksa bu görüntüyü atla
          if (!hasActiveColumns) {
            console.log(`Skipping image ${imageName} - No active columns`);
            continue;
          }

          // Find and read image
          const { path: imagePath, fileName } = await getImage(
            savedPaths.imagePath,
            imageName,
          );

          console.log("Image path:", imagePath);
          console.log("Font path:", savedPaths.fontPath);
          console.log("Output path:", outputDir);

          // Load image
          const imageBuffer = await fs.readFile(imagePath);
          const image = await loadImage(imageBuffer);

          // Create canvas with image dimensions
          const canvas = createCanvas(image.width, image.height);
          const ctx = canvas.getContext("2d");

          // Draw image on canvas
          ctx.drawImage(image, 0, 0);

          console.log("Using positions:", positions);
          console.log("Using image positions:", imagePositions);

          // Add text for each enabled column
          for (const [column, value] of Object.entries(row)) {
            if (column === "img_path") continue;

            const columnPosition = imagePositions[column];
            if (!columnPosition?.isEnabled) continue;

            let text = String(value);

            // Use font if specified
            let fontInfo = { family: "Arial" };
            if (
              savedPaths.fontPath &&
              columnPosition.fontFamily &&
              columnPosition.fontFamily !== "not-set"
            ) {
              try {
                const fontData = getFontFamily(columnPosition.fontFamily);
                fontInfo.family = fontData.family;
                console.log("Using font:", fontData.family);
              } catch (error) {
                console.error("Font loading error:", error);
                text = "Font Error: " + text;
              }
            }

            // Set font and text properties
            console.log("Using font family:", fontInfo.family);

            // Font ayarlarını yap
            const fontSize = columnPosition.fontSize;
            ctx.font = `${fontSize}px ${fontInfo.family}`;
            console.log("Font string:", ctx.font);

            // Letter spacing için her karakteri ayrı çiz
            let currentX = columnPosition.x;
            const spacing = 1.5; // 2 piksel boşluk

            // Önce arkaplanı çiz
            const totalWidth =
              ctx.measureText(text).width + (text.length - 1) * spacing;
            const textHeight = columnPosition.fontSize;

            ctx.fillStyle = `rgba(${columnPosition.backgroundColor.r}, ${columnPosition.backgroundColor.g}, ${columnPosition.backgroundColor.b}, ${columnPosition.backgroundColor.a})`;
            ctx.fillRect(
              columnPosition.x,
              columnPosition.y,
              totalWidth,
              textHeight,
            );

            // Sonra her karakteri çiz
            ctx.fillStyle = `rgba(${columnPosition.color.r}, ${columnPosition.color.g}, ${columnPosition.color.b}, ${columnPosition.color.a})`;
            ctx.textBaseline = "top";

            for (let char of text) {
              ctx.fillText(char, currentX, columnPosition.y);
              currentX += ctx.measureText(char).width + spacing;
            }
          }

          // Create output file name with current Excel file name
          const outputPath = path.join(
            outputDir,
            `${path.basename(excelFileName, ".xlsx")}-${
              data.indexOf(row) + 1
            }-${fileName}`,
          );

          console.log("Saving to:", outputPath);

          // Save the processed image
          const buffer = canvas.toBuffer("image/jpeg", { quality: 1 });
          await fs.writeFile(outputPath, buffer);
          results.push(outputPath);
        } catch (error) {
          console.error("Error processing row:", error);
          errors.push(`Row ${data.indexOf(row) + 1}: ${error.message}`);
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
};
