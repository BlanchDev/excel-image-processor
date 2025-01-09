import { useImageManager } from "../../context/AppContext";
import PropTypes from "prop-types";
import "./CoordinatesModal.scss";
import { RgbaColorPicker } from "react-colorful";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

function CoordinatesModal({ onClose, image }) {
  const {
    positions,
    excelColumns,
    fonts,
    handlePositionChange,
    handleColorChange,
    DEFAULT_COLUMN_POSITION,
  } = useImageManager();

  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const colorPickerRefs = useRef({});
  const canvasRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.25);
  const [excelData, setExcelData] = useState(null);

  // Font yükleme fonksiyonu
  const loadFont = useCallback(async (fontFileName) => {
    if (!fontFileName || fontFileName === "not-set") {
      return { family: "Arial" };
    }

    try {
      console.log("Loading font:", fontFileName);
      const fontInfo = await window.Electron.getFontFamily(fontFileName);
      const fontDataUrl = await window.Electron.getFontPath(fontFileName);

      if (!fontDataUrl) {
        console.log("Font data not found, using Arial");
        return { family: "Arial" };
      }

      try {
        // Font yüklemeyi dene
        const font = new FontFace(fontInfo.family, `url(${fontDataUrl})`);
        await font.load();
        document.fonts.add(font);
        console.log("Font loaded successfully:", fontInfo.family);
        return fontInfo;
      } catch (error) {
        console.error("Font loading error for", fontFileName, ":", error);
        return { family: "Arial" };
      }
    } catch (error) {
      console.error(`Error loading font ${fontFileName}:`, error);
      return { family: "Arial" };
    }
  }, []);

  const imagePositions = useMemo(() => {
    const currentExcelPositions = positions[image] || {};
    const defaultPositions = {};
    excelColumns.forEach((column) => {
      defaultPositions[column] = { ...DEFAULT_COLUMN_POSITION };
    });
    return { ...defaultPositions, ...currentExcelPositions };
  }, [positions, image, excelColumns, DEFAULT_COLUMN_POSITION]);

  useEffect(() => {
    const loadExcelData = async () => {
      try {
        const data = await window.Electron.getExcelData();
        if (data && data.length > 0) {
          const imageRow = data.find((row) => row.img_path === image);
          if (imageRow) {
            console.log(`Loading first row data for image: ${image}`);
            setExcelData(imageRow);
            setPreviewScale(0.25);
          } else {
            console.log(`No data found for image: ${image}`);
            setExcelData(null);
          }
        }
      } catch (error) {
        console.error("Excel data loading error:", error);
        setExcelData(null);
      }
    };
    loadExcelData();
  }, [image]);

  const loadPreview = useCallback(async () => {
    try {
      const imageData = await window.Electron.getImagePreview(image);
      if (!imageData) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const img = new Image();
      img.onload = async () => {
        const scale = (await window.Electron.getStore("imageScale")) || 1;
        canvas.width = img.width * scale * previewScale;
        canvas.height = img.height * scale * previewScale;

        ctx.scale(scale * previewScale, scale * previewScale);
        ctx.drawImage(img, 0, 0);

        // Her sütun için metin ekle
        for (const [column, pos] of Object.entries(imagePositions)) {
          if (!pos.isEnabled || column === "img_path") continue;

          let text = excelData ? String(excelData[column] || column) : column;

          // Font ayarlarını yap
          let fontInfo = { family: "Arial" };
          if (pos.fontFamily) {
            try {
              // Font bilgisini al ve yükle
              fontInfo = await loadFont(pos.fontFamily);
              console.log("Using font:", fontInfo.family);
            } catch (error) {
              console.error("Font loading error:", error);
              text = "Font Error: " + text;
            }
          }

          // Font ayarlarını yap
          const fontSize = pos.fontSize || 12;
          ctx.font = `${fontSize}px "${fontInfo.family}"`;
          console.log("Font string:", ctx.font);
          ctx.textBaseline = "top";

          // Letter spacing için her karakteri ayrı çiz
          let currentX = pos.x;
          const spacing = 0.5;

          // Önce arkaplanı çiz
          const totalWidth =
            ctx.measureText(text).width + (text.length - 1) * spacing;
          const textHeight = fontSize;

          ctx.fillStyle = `rgba(${pos.backgroundColor.r}, ${pos.backgroundColor.g}, ${pos.backgroundColor.b}, ${pos.backgroundColor.a})`;
          ctx.fillRect(pos.x, pos.y, totalWidth, textHeight);

          // Sonra her karakteri çiz
          ctx.fillStyle = `rgba(${pos.color.r}, ${pos.color.g}, ${pos.color.b}, ${pos.color.a})`;

          for (let char of text) {
            ctx.fillText(char, currentX, pos.y);
            currentX += ctx.measureText(char).width + spacing;
          }
        }
      };
      img.src = imageData;
    } catch (error) {
      console.error("Preview error:", error);
    }
  }, [image, imagePositions, previewScale, excelData, loadFont]);

  useEffect(() => {
    if (!image) return;

    loadPreview();
  }, [
    image,
    imagePositions,
    previewScale,
    excelData,
    fonts,
    loadFont,
    loadPreview,
  ]);

  useEffect(() => {
    function handleClickOutside(event) {
      const activePickerRef = colorPickerRefs.current[activeColorPicker];
      if (activePickerRef && !activePickerRef.contains(event.target)) {
        setActiveColorPicker(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeColorPicker]);

  useEffect(() => {
    loadPreview();
  }, [previewScale, loadPreview]);

  return (
    <div className='coordinates-modal-overlay'>
      <button onClick={onClose} className='close-overlay-button' />
      <div className='coordinates-modal'>
        <div className='coordinates-modal-header'>
          <h3>{image} - Column Settings</h3>
          <button className='close-button' onClick={onClose}>
            ×
          </button>
        </div>

        <div className='coordinates-modal-content'>
          <table className='coordinates-table'>
            <thead>
              <tr>
                <th>Column</th>
                <th>Use</th>
                <th>X Coordinate</th>
                <th>Y Coordinate</th>
                <th>Font Size</th>
                <th>Font</th>
                <th>Text Color</th>
                <th>Background</th>
              </tr>
            </thead>
            <tbody>
              {excelColumns.map((column) => {
                const columnPosition =
                  imagePositions[column] || DEFAULT_COLUMN_POSITION;
                const isImgPathColumn = column === "img_path";

                return (
                  <tr
                    key={column}
                    className={columnPosition.isEnabled ? "" : "inactive"}
                  >
                    <td>{column}</td>
                    <td>
                      <input
                        type='checkbox'
                        checked={columnPosition.isEnabled}
                        onChange={(e) =>
                          handlePositionChange(
                            image,
                            column,
                            "isEnabled",
                            e.target.checked,
                          )
                        }
                        disabled={isImgPathColumn}
                      />
                    </td>
                    <td>
                      <input
                        type='number'
                        value={columnPosition.x}
                        onChange={(e) =>
                          handlePositionChange(
                            image,
                            column,
                            "x",
                            e.target.value,
                          )
                        }
                        disabled={isImgPathColumn || !columnPosition.isEnabled}
                      />
                    </td>
                    <td>
                      <input
                        type='number'
                        value={columnPosition.y}
                        onChange={(e) =>
                          handlePositionChange(
                            image,
                            column,
                            "y",
                            e.target.value,
                          )
                        }
                        disabled={isImgPathColumn || !columnPosition.isEnabled}
                      />
                    </td>
                    <td>
                      <input
                        type='number'
                        value={columnPosition.fontSize}
                        onChange={(e) =>
                          handlePositionChange(
                            image,
                            column,
                            "fontSize",
                            e.target.value,
                          )
                        }
                        disabled={isImgPathColumn || !columnPosition.isEnabled}
                      />
                    </td>
                    <td>
                      <select
                        value={columnPosition.fontFamily || "not-set"}
                        onChange={(e) =>
                          handlePositionChange(
                            image,
                            column,
                            "fontFamily",
                            e.target.value === "not-set" ? "" : e.target.value,
                          )
                        }
                        disabled={isImgPathColumn || !columnPosition.isEnabled}
                        title={columnPosition.fontFamily}
                      >
                        <option value='not-set'>Select Font</option>
                        {fonts
                          .filter((font) =>
                            /\.(ttf|otf|woff|woff2)$/i.test(font.fileName),
                          )
                          .map((font) => (
                            <option key={font.fileName} value={font.fileName}>
                              {font.displayName}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <div
                        className={`color-preview ${
                          isImgPathColumn || !columnPosition.isEnabled
                            ? "disabled"
                            : ""
                        }`}
                        style={{
                          backgroundColor: `rgba(${columnPosition.color.r}, ${columnPosition.color.g}, ${columnPosition.color.b}, ${columnPosition.color.a})`,
                        }}
                        onClick={() => {
                          if (!isImgPathColumn && columnPosition.isEnabled) {
                            setActiveColorPicker(
                              activeColorPicker === `${column}-color`
                                ? null
                                : `${column}-color`,
                            );
                          }
                        }}
                      />
                      {activeColorPicker === `${column}-color` &&
                        !isImgPathColumn &&
                        columnPosition.isEnabled && (
                          <div
                            className='color-picker-popup'
                            ref={(el) =>
                              (colorPickerRefs.current[`${column}-color`] = el)
                            }
                          >
                            <RgbaColorPicker
                              color={columnPosition.color}
                              onChange={(color) =>
                                handleColorChange(image, column, color, "color")
                              }
                            />
                          </div>
                        )}
                    </td>
                    <td>
                      <div
                        className={`color-preview ${
                          isImgPathColumn || !columnPosition.isEnabled
                            ? "disabled"
                            : ""
                        }`}
                        style={{
                          backgroundColor: `rgba(${columnPosition.backgroundColor.r}, ${columnPosition.backgroundColor.g}, ${columnPosition.backgroundColor.b}, ${columnPosition.backgroundColor.a})`,
                        }}
                        onClick={() => {
                          if (!isImgPathColumn && columnPosition.isEnabled) {
                            setActiveColorPicker(
                              activeColorPicker === `${column}-bg`
                                ? null
                                : `${column}-bg`,
                            );
                          }
                        }}
                      />
                      {activeColorPicker === `${column}-bg` &&
                        !isImgPathColumn &&
                        columnPosition.isEnabled && (
                          <div
                            className='color-picker-popup'
                            ref={(el) =>
                              (colorPickerRefs.current[`${column}-bg`] = el)
                            }
                          >
                            <RgbaColorPicker
                              color={columnPosition.backgroundColor}
                              onChange={(color) =>
                                handleColorChange(
                                  image,
                                  column,
                                  color,
                                  "backgroundColor",
                                )
                              }
                            />
                          </div>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className='preview-section'>
            <h3>Preview</h3>
            <div className='preview-controls'>
              <label>Preview Scale:</label>
              <select
                value={previewScale}
                onChange={(e) => setPreviewScale(Number(e.target.value))}
                onWheel={(e) => {
                  e.preventDefault();
                  const options = [
                    0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6,
                    0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1,
                  ];
                  const currentIndex = options.indexOf(previewScale);
                  let newIndex;

                  // Yukarı scroll
                  if (e.deltaY < 0) {
                    newIndex = Math.min(currentIndex + 1, options.length - 1);
                  }
                  // Aşağı scroll
                  else {
                    newIndex = Math.max(currentIndex - 1, 0);
                  }

                  setPreviewScale(options[newIndex]);
                  loadPreview();
                }}
              >
                <option value={0.1}>10%</option>
                <option value={0.15}>15%</option>
                <option value={0.2}>20%</option>
                <option value={0.25}>25%</option>
                <option value={0.3}>30%</option>
                <option value={0.35}>35%</option>
                <option value={0.4}>40%</option>
                <option value={0.45}>45%</option>
                <option value={0.5}>50%</option>
                <option value={0.55}>55%</option>
                <option value={0.6}>60%</option>
                <option value={0.65}>65%</option>
                <option value={0.7}>70%</option>
                <option value={0.75}>75%</option>
                <option value={0.8}>80%</option>
                <option value={0.85}>85%</option>
                <option value={0.9}>90%</option>
                <option value={0.95}>95%</option>
                <option value={1}>100%</option>
              </select>
            </div>
            <div className='preview-container'>
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

CoordinatesModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  image: PropTypes.string.isRequired,
};

export default CoordinatesModal;
