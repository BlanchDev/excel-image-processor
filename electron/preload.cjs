const { contextBridge, ipcRenderer } = require("electron");

/**
 * @typedef {Object} ProcessResult
 * @property {boolean} success - Was the process successful?
 * @property {string[]} [results] - Processed file paths
 * @property {string[]} [errors] - Error messages
 * @property {string} [saveDir] - Save directory
 * @property {string} [error] - General error message
 */

/**
 * @typedef {Object} PathResult
 * @property {string | null} path - Selected file/folder path
 */

/**
 * @typedef {Object} SavedPaths
 * @property {string} excelPath - Excel file path
 * @property {string} imagePath - Image folder path
 * @property {string} outputDir - Output directory path
 * @property {string} fontPath - Font folder path
 */

/**
 * @typedef {Object} Color
 * @property {number} r - Red (0-255)
 * @property {number} g - Green (0-255)
 * @property {number} b - Blue (0-255)
 * @property {number} a - Alpha (0-1)
 */

/**
 * @typedef {Object} ColumnPosition
 * @property {boolean} isEnabled - Is column active?
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} fontSize - Font size
 * @property {string} fontFamily - Font family
 * @property {Color} color - Text color
 * @property {Color} backgroundColor - Background color
 */

/**
 * @typedef {Object.<string, ColumnPosition>} ImageColumns - Column settings for image
 */

/**
 * @typedef {Object.<string, ImageColumns>} ImagePositions - Column settings for all images
 */

contextBridge.exposeInMainWorld("Electron", {
  /** @returns {Promise<PathResult>} */
  selectImageFolder: () => ipcRenderer.invoke("select-image-folder"),

  /** @returns {Promise<PathResult>} */
  selectOutput: () => ipcRenderer.invoke("select-output"),

  /** @returns {Promise<SavedPaths>} */
  getSavedPaths: () => ipcRenderer.invoke("get-saved-paths"),

  /** @returns {Promise<SavedPaths>} */
  resetPaths: () => ipcRenderer.invoke("reset-paths"),

  /** @returns {Promise<ProcessResult>} */
  processExcelAndImage: () => ipcRenderer.invoke("process-excel-and-image"),

  /** @returns {Promise<ImagePositions>} */
  getImagePositions: () => ipcRenderer.invoke("get-image-positions"),

  /**
   * @param {ImagePositions} positions
   * @returns {Promise<boolean>}
   */
  saveImagePositions: (positions) =>
    ipcRenderer.invoke("save-image-positions", positions),

  /** @returns {Promise<string[]>} */
  getImageList: () => ipcRenderer.invoke("get-image-list"),

  /** @returns {Promise<PathResult>} */
  selectFontFolder: () => ipcRenderer.invoke("select-font-folder"),

  /** @returns {Promise<string[]>} */
  getFontList: () => ipcRenderer.invoke("get-font-list"),

  /** @returns {Promise<string[]>} */
  getExcelColumns: () => ipcRenderer.invoke("get-excel-columns"),

  /** @returns {Promise<Object[]>} */
  getExcelData: () => ipcRenderer.invoke("get-excel-data"),

  getStoreImagePositions: () => ipcRenderer.invoke("get-image-positions"),

  selectExcelFolder: () => ipcRenderer.invoke("select-excel-folder"),

  getExcelFiles: () => ipcRenderer.invoke("get-excel-files"),

  selectExcelFile: (filePath) =>
    ipcRenderer.invoke("select-excel-file", filePath),

  getActiveExcel: () => ipcRenderer.invoke("get-active-excel"),

  setActiveExcel: (filePath) =>
    ipcRenderer.invoke("set-active-excel", filePath),

  getStore: (key) => ipcRenderer.invoke("get-store", key),

  setStore: (key, value) => ipcRenderer.invoke("set-store", key, value),
});
