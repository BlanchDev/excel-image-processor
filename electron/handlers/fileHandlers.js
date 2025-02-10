import { dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import store from "../store.js";
import { Buffer } from "buffer";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from "pdf-lib";
import { convert } from "pdf-poppler";

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
      filters: [
        { name: "Excel", extensions: ["xlsx", "xls", "xlsm", "xlsmx"] },
      ],
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
        .filter(
          (file) =>
            file.endsWith(".xlsx") ||
            file.endsWith(".xls") ||
            file.endsWith(".xlsm"),
        )
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

  // Get PDF form fields
  ipcMain.handle("get-pdf-form-fields", async (event, pdfName) => {
    try {
      console.log("Backend: Getting form fields for:", pdfName);
      if (!savedPaths.imagePath || !pdfName)
        return { success: false, error: "PDF path not found" };

      const pdfPath = path.join(savedPaths.imagePath, pdfName);
      console.log("Backend: PDF path:", pdfPath);

      // PDF'i yükle
      const pdfBytes = await fs.readFile(pdfPath);
      const data = new Uint8Array(pdfBytes);
      const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
      const page = await pdfDoc.getPage(1);
      const annotations = await page.getAnnotations();

      // Form alanlarını filtrele
      const formFields = annotations
        .filter((annotation) => annotation.subtype === "Widget")
        .map((field) => {
          let fieldType = "TextField";
          let fieldValue = field.fieldValue || "";

          // Alan tipini belirle
          if (field.fieldType === "Tx") {
            fieldType = "TextField";
          } else if (field.fieldType === "Btn") {
            if (field.checkBox) {
              fieldType = "CheckBox";
              fieldValue = field.checkBox.isChecked ? "Checked" : "Unchecked";
            } else if (field.radioButton) {
              fieldType = "RadioButton";
              fieldValue = field.radioButton.isSelected
                ? "Selected"
                : "Unselected";
            }
          } else if (field.fieldType === "Ch") {
            fieldType = "Choice";
          }

          return {
            name: field.fieldName || "",
            type: fieldType,
            value: fieldValue,
          };
        });

      console.log("Backend: Found form fields:", formFields);
      return { success: true, fields: formFields };
    } catch (error) {
      console.error("Backend: Error getting PDF form fields:", error);
      return { success: false, error: error.message };
    }
  });

  // Get PDF replacements
  ipcMain.handle("get-pdf-replacements", () => {
    return store.get("pdfReplacements");
  });

  // Save PDF replacements
  ipcMain.handle("save-pdf-replacements", (event, replacements) => {
    store.set("pdfReplacements", replacements);
    return true;
  });

  // Get PDF list
  ipcMain.handle("get-pdf-list", async () => {
    try {
      const files = await fs.readdir(savedPaths.imagePath);
      return files.filter((file) => /\.pdf$/i.test(file));
    } catch {
      return [];
    }
  });

  // Get PDF preview
  ipcMain.handle("get-pdf-preview", async (event, pdfName) => {
    try {
      if (!savedPaths.imagePath || !pdfName) return null;

      const pdfPath = path.join(savedPaths.imagePath, pdfName);
      const buffer = await fs.readFile(pdfPath);
      const data = new Uint8Array(buffer);

      return `data:application/pdf;base64,${Buffer.from(data).toString(
        "base64",
      )}`;
    } catch (error) {
      console.error("Error getting PDF preview:", error);
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
              `${path.basename(activeExcel).replace(/\./g, "")}-${path
                .basename(imageName, path.extname(imageName))
                .replace(/\./g, "")}${path.extname(imageName)}`,
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
      // Hem resim hem de PDF dosyalarını göster
      return files.filter((file) => file.match(/\.(jpg|jpeg|png|pdf)$/i));
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

      // Dosya uzantısına göre farklı önizleme formatı kullan
      if (filename.toLowerCase().endsWith(".pdf")) {
        return `data:application/pdf;base64,${data.toString("base64")}`;
      } else {
        return `data:image/png;base64,${data.toString("base64")}`;
      }
    } catch (error) {
      console.error("Error reading output file:", error);
      return null;
    }
  });

  // Process Excel and PDF
  ipcMain.handle("process-excel-and-pdf", async (event, pdfData) => {
    try {
      const outputDir = savedPaths.outputDir;
      const activeExcel = store.get("activeExcelFile");

      if (!outputDir) {
        throw new Error("Output folder not selected");
      }

      if (!activeExcel) {
        throw new Error("Excel file not selected");
      }

      // Excel dosya adını al
      const excelFileName = path.basename(activeExcel).replace(/\./g, "");

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      const results = [];
      const errors = [];

      // Her PDF için işlem yap
      for (const { pdfName, rowData, rowIndex } of pdfData) {
        try {
          // PDF dosya adı kontrolü
          if (!pdfName.toLowerCase().endsWith(".pdf")) {
            console.log(`Not a PDF file: ${pdfName}`);
            continue;
          }

          const pdfPath = path.join(savedPaths.imagePath, pdfName);

          // PDF dosyasının varlığını kontrol et
          if (
            !(await fs
              .access(pdfPath)
              .then(() => true)
              .catch(() => false))
          ) {
            console.log(`PDF file not found: ${pdfName}`);
            errors.push(`PDF file not found: ${pdfName} (row ${rowIndex})`);
            continue;
          }

          // PDF için tanımlı değişiklikleri al
          const pdfReplacements = store.get("pdfReplacements") || {};
          const currentPdfReplacements =
            pdfReplacements[path.basename(activeExcel)] || {};
          const columnReplacements = currentPdfReplacements[pdfName] || {};

          // PDF'i işle
          const pdfDoc = await processPdfForm(
            pdfPath,
            columnReplacements,
            rowData,
          );

          // Çıktı dosya adını oluştur: exceldosyaismi-satirno-pdfdosyaismi.pdf
          const outputPath = path.join(
            outputDir,
            `${excelFileName}-${rowIndex}-${path
              .basename(pdfName, path.extname(pdfName))
              .replace(/\./g, "")}${path.extname(pdfName)}`,
          );

          // PDF'i kaydet
          const modifiedPdfBytes = await pdfDoc.save({
            updateFieldAppearances: true,
          });
          await fs.writeFile(outputPath, modifiedPdfBytes);
          results.push(outputPath);
        } catch (error) {
          console.error(`Error processing PDF ${pdfName}:`, error);
          errors.push(`${pdfName} (row ${rowIndex}): ${error.message}`);
        }
      }

      return {
        success: true,
        results,
        errors,
        saveDir: outputDir,
      };
    } catch (error) {
      console.error("Error in process-excel-and-pdf:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // PDF form işleme yardımcı fonksiyonu
  const processPdfForm = async (pdfPath, replacements, rowData) => {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Form alanlarını doldur
    for (const [column, fieldName] of Object.entries(replacements)) {
      if (!fieldName || rowData[column] === undefined) continue;

      try {
        const field = form.getField(fieldName);
        if (!field) {
          console.log(`Form field not found: ${fieldName}`);
          continue;
        }

        // Değeri string'e çevir ve Türkçe karakterleri düzelt
        let value = String(rowData[column] || "")
          .replace(/ş/g, "s")
          .replace(/Ş/g, "S")
          .replace(/ı/g, "i")
          .replace(/İ/g, "I")
          .replace(/ğ/g, "g")
          .replace(/Ğ/g, "G")
          .replace(/ü/g, "u")
          .replace(/Ü/g, "U")
          .replace(/ö/g, "o")
          .replace(/Ö/g, "O")
          .replace(/ç/g, "c")
          .replace(/Ç/g, "C");

        // Alan tipine göre değeri ayarla
        if (field instanceof PDFTextField) {
          field.setText(value);
        } else if (field instanceof PDFCheckBox) {
          if (value.toLowerCase() === "true" || value === "1") {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFRadioGroup) {
          field.select(value);
        } else if (field instanceof PDFDropdown) {
          field.select(value);
        }
      } catch (error) {
        console.error(`Error setting field ${fieldName}:`, error);
      }
    }

    return pdfDoc;
  };

  // Convert PDF to PNG
  ipcMain.handle("convert-pdf-to-png", async (event) => {
    try {
      const outputPath = savedPaths.outputDir;
      if (!outputPath) {
        throw new Error("Output directory not selected");
      }

      const files = await fs.readdir(outputPath);
      const pdfFiles = files.filter((file) =>
        file.toLowerCase().endsWith(".pdf"),
      );
      const errors = [];
      const results = [];

      const totalFiles = pdfFiles.length;
      if (totalFiles === 0) {
        return {
          success: true,
          results,
          errors,
          status: "No PDF files found to convert",
        };
      }

      for (let i = 0; i < pdfFiles.length; i++) {
        const pdfFile = pdfFiles[i];
        try {
          // İlerleme durumunu gönder
          event.sender.send(
            "conversion-status",
            `Converting PDF to PNG (${i + 1}/${totalFiles}): ${pdfFile}`,
          );

          const pdfPath = path.join(outputPath, pdfFile);
          const pngFileName = pdfFile.replace(/\.pdf$/i, ".png");

          const opts = {
            format: "png",
            out_dir: outputPath,
            out_prefix: path.basename(pngFileName, ".png"),
            page: 1,
            density: 4320,
            quality: 100,
            compression: 0,
          };

          await convert(pdfPath, opts);
          results.push(pngFileName);
        } catch (error) {
          console.error(`Error converting ${pdfFile}:`, error);
          errors.push(`${pdfFile}: ${error.message}`);
        }
      }

      // Son durumu gönder
      event.sender.send(
        "conversion-status",
        `Completed converting ${results.length} files to PNG`,
      );

      return {
        success: true,
        results,
        errors,
      };
    } catch (error) {
      console.error("Error in convert-pdf-to-png:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });
};
