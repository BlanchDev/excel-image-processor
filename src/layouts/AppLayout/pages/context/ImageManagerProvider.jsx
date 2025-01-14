import { useCallback, useMemo, useState } from "react";
import { ImageManagerContext, useFilePaths } from "./AppContext";
import { useEffect } from "react";
import PropTypes from "prop-types";

function ImageManagerProvider({ children }) {
  const [images, setImages] = useState([]);
  const [positions, setPositions] = useState({});
  const [fonts, setFonts] = useState([]);
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const [excelColumns, setExcelColumns] = useState([]);
  const [excelImagePaths, setExcelImagePaths] = useState([]);

  const { excelFiles, loadExcelFiles, currentExcel } = useFilePaths();

  const DEFAULT_COLUMN_POSITION = useMemo(
    () => ({
      isEnabled: false,
      x: 0,
      y: 0,
      fontSize: 12,
      fontFamily: "",
      alignment: "left",
      color: { r: 0, g: 0, b: 0, a: 1 },
      backgroundColor: { r: 255, g: 255, b: 255, a: 0 },
    }),
    [],
  );

  const cleanupUnusedColumns = useCallback((currentColumns, savedPositions) => {
    const newPositions = { ...savedPositions };
    let hasChanges = false;

    // For Excel-based positions
    Object.keys(newPositions).forEach((excelFile) => {
      const excelPositions = newPositions[excelFile];

      // For each image
      Object.keys(excelPositions).forEach((imageName) => {
        const imageColumns = excelPositions[imageName];

        // For each column
        Object.keys(imageColumns).forEach((columnName) => {
          // If column no longer exists in Excel, delete it
          if (!currentColumns.includes(columnName)) {
            delete imageColumns[columnName];
            hasChanges = true;
          }
        });

        // If image has no column settings left, delete the image
        if (Object.keys(imageColumns).length === 0) {
          delete excelPositions[imageName];
          hasChanges = true;
        }
      });

      // If Excel has no image settings left, delete the Excel
      if (Object.keys(excelPositions).length === 0) {
        delete newPositions[excelFile];
        hasChanges = true;
      }
    });

    return hasChanges ? newPositions : savedPositions;
  }, []);

  const handlePositionChange = useCallback(
    async (imageName, columnName, property, value) => {
      if (!currentExcel) return;

      const newPositions = {
        ...positions,
        [currentExcel]: {
          ...(positions[currentExcel] || {}),
          [imageName]: {
            ...(positions[currentExcel]?.[imageName] || {}),
            [columnName]: {
              ...(positions[currentExcel]?.[imageName]?.[columnName] ||
                DEFAULT_COLUMN_POSITION),
              [property]:
                property === "fontSize" ||
                property === "fontFamily" ||
                property === "color" ||
                property === "backgroundColor" ||
                property === "isEnabled" ||
                property === "alignment"
                  ? value
                  : parseInt(value) || 0,
            },
          },
        },
      };

      console.log("New positions:", newPositions);
      setPositions(newPositions);
      await window.Electron.saveImagePositions(newPositions);
    },
    [positions, currentExcel, DEFAULT_COLUMN_POSITION],
  );

  const handleColorChange = useCallback(
    (imageName, columnName, newColor, type = "color") => {
      if (!currentExcel) return;

      const newPositions = {
        ...positions,
        [currentExcel]: {
          ...(positions[currentExcel] || {}),
          [imageName]: {
            ...(positions[currentExcel]?.[imageName] || {}),
            [columnName]: {
              ...(positions[currentExcel]?.[imageName]?.[columnName] ||
                DEFAULT_COLUMN_POSITION),
              [type]: newColor,
            },
          },
        },
      };

      setPositions(newPositions);
      window.Electron.saveImagePositions(newPositions);
    },
    [positions, currentExcel, DEFAULT_COLUMN_POSITION],
  );

  const loadData = useCallback(async () => {
    if (!window.Electron) return;

    const savedPositions = await window.Electron.getImagePositions();
    const imageList = await window.Electron.getImageList();
    const fontList = await window.Electron.getFontList();
    const columns = await window.Electron.getExcelColumns();
    const excelData = await window.Electron.getExcelData();

    // Get img_path column values from Excel
    const imgPaths = excelData
      .map((row) => row.img_path || row["img_path"])
      .filter(Boolean);
    setExcelImagePaths(imgPaths);

    const cleanedPositions = cleanupUnusedColumns(columns, savedPositions);

    if (cleanedPositions !== savedPositions) {
      await window.Electron.saveImagePositions(cleanedPositions);
    }

    setPositions(cleanedPositions);
    setImages(imageList);
    setFonts(fontList);
    setExcelColumns(columns);
  }, [cleanupUnusedColumns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // currentExcel değiştiğinde verileri yükle
  useEffect(() => {
    if (currentExcel) {
      loadData();
    }
  }, [currentExcel, loadData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        activeColorPicker &&
        !event.target.closest(".color-picker-container")
      ) {
        setActiveColorPicker(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeColorPicker]);

  const values = useMemo(
    () => ({
      images,
      positions: positions[currentExcel] || {},
      fonts,
      excelColumns,
      excelImagePaths,
      activeColorPicker,
      handlePositionChange,
      handleColorChange,
      setActiveColorPicker,
      DEFAULT_COLUMN_POSITION,
      loadData,
      currentExcel,
      excelFiles,
      loadExcelFiles,
    }),
    [
      images,
      positions,
      fonts,
      excelColumns,
      excelImagePaths,
      activeColorPicker,
      handlePositionChange,
      handleColorChange,
      setActiveColorPicker,
      DEFAULT_COLUMN_POSITION,
      loadData,
      currentExcel,
      excelFiles,
      loadExcelFiles,
    ],
  );

  return (
    <ImageManagerContext.Provider value={values}>
      {children}
    </ImageManagerContext.Provider>
  );
}

ImageManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ImageManagerProvider;
