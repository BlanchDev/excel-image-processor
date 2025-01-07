import { useCallback, useEffect, useMemo, useState } from "react";
import { FilePathsContext, useStatus } from "./AppContext";
import PropTypes from "prop-types";

function FilePathsProvider({ children }) {
  const [paths, setPaths] = useState({
    excelFolderPath: "",
    imagePath: "",
    outputDir: "",
    fontPath: "",
  });
  const [excelFiles, setExcelFiles] = useState([]);
  const [currentExcel, setCurrentExcel] = useState("");

  const { setStatus } = useStatus();

  // Get filename from file path
  const getFileName = useCallback((filePath) => {
    if (!filePath) return "";
    const parts = filePath.split(/[\\/]/); // For Windows and Unix paths
    return parts[parts.length - 1];
  }, []);

  const loadExcelFiles = useCallback(async () => {
    if (!window.Electron) return;
    const files = await window.Electron.getExcelFiles();
    setExcelFiles(files);
  }, []);

  const handleSelectExcelFile = useCallback(
    async (filePath) => {
      if (!window.Electron) return;
      const result = await window.Electron.selectExcelFile(filePath);
      if (result.path) {
        setCurrentExcel(getFileName(result.path));
        await window.Electron.setActiveExcel(result.path);
        setStatus("Excel file selected successfully.");
      }
    },
    [setStatus, getFileName],
  );

  const handleResetPaths = useCallback(async () => {
    if (!window.Electron) {
      console.error("Electron not found!");
      return;
    }
    const resetPaths = await window.Electron.resetPaths();
    setPaths(resetPaths);
    setCurrentExcel("");
    await window.Electron.setActiveExcel("");
    setStatus("Saved paths have been reset.");
  }, [setPaths, setStatus]);

  const handleSelectExcelFolder = useCallback(async () => {
    if (!window.Electron) {
      console.error("Electron not found!");
      return;
    }
    const result = await window.Electron.selectExcelFolder();
    if (result.path) {
      setPaths((prev) => ({ ...prev, excelFolderPath: result.path }));
      setStatus("Excel folder selected successfully.");
    }
  }, [setPaths, setStatus]);

  // Sayfa yüklendiğinde Excel dosyalarını yükle
  useEffect(() => {
    loadExcelFiles();
  }, [loadExcelFiles]);

  // Herhangi bir path değiştiğinde Excel dosyalarını güncelle
  useEffect(() => {
    loadExcelFiles();
  }, [paths, loadExcelFiles]);

  // currentExcel değiştiğinde Excel verilerini yükle
  useEffect(() => {
    if (currentExcel && window.Electron) {
      const excelPath = excelFiles.find(
        (file) => file.name === currentExcel,
      )?.path;
      if (excelPath) {
        window.Electron.selectExcelFile(excelPath);
      }
    }
  }, [currentExcel, excelFiles]);

  useEffect(() => {
    const loadSavedPaths = async () => {
      if (window.Electron) {
        try {
          const savedPaths = await window.Electron.getSavedPaths();
          setPaths(savedPaths);
          // Active Excel dosyasını yükle
          const activeExcel = await window.Electron.getActiveExcel();
          if (activeExcel) {
            setCurrentExcel(getFileName(activeExcel));
          }
        } catch (error) {
          console.error("Error loading paths:", error);
        }
      } else {
        console.error("Electron not found!");
      }
    };
    loadSavedPaths();
  }, [getFileName]);

  const handleSelectImageFolder = useCallback(async () => {
    if (!window.Electron) {
      console.error("Electron not found!");
      return;
    }
    const result = await window.Electron.selectImageFolder();
    if (result.path) {
      setPaths((prev) => ({ ...prev, imagePath: result.path }));
      setStatus("Image folder selected successfully.");
    }
  }, [setPaths, setStatus]);

  const handleSelectOutput = useCallback(async () => {
    if (!window.Electron) {
      console.error("Electron not found!");
      return;
    }
    const result = await window.Electron.selectOutput();
    if (result.path) {
      setPaths((prev) => ({ ...prev, outputDir: result.path }));
      setStatus("Output folder selected successfully.");
    }
  }, [setPaths, setStatus]);

  const handleSelectFontFolder = useCallback(async () => {
    if (!window.Electron) {
      console.error("Electron not found!");
      return;
    }
    const result = await window.Electron.selectFontFolder();
    if (result.path) {
      setPaths((prev) => ({ ...prev, fontPath: result.path }));
      setStatus("Font folder selected successfully.");
    }
  }, [setPaths, setStatus]);

  const value = useMemo(
    () => ({
      paths,
      excelFiles,
      currentExcel,
      loadExcelFiles,
      handleResetPaths,
      handleSelectImageFolder,
      handleSelectOutput,
      handleSelectFontFolder,
      handleSelectExcelFolder,
      handleSelectExcelFile,
    }),
    [
      paths,
      excelFiles,
      currentExcel,
      loadExcelFiles,
      handleResetPaths,
      handleSelectImageFolder,
      handleSelectOutput,
      handleSelectFontFolder,
      handleSelectExcelFolder,
      handleSelectExcelFile,
    ],
  );

  return (
    <FilePathsContext.Provider value={value}>
      {children}
    </FilePathsContext.Provider>
  );
}

FilePathsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default FilePathsProvider;
