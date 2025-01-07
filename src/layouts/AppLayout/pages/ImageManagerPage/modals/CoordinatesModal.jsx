import { useImageManager } from "../../context/AppContext";
import PropTypes from "prop-types";
import "./CoordinatesModal.scss";
import { RgbaColorPicker } from "react-colorful";
import { useState, useEffect, useRef } from "react";

function CoordinatesModal({ onClose, image }) {
  const {
    positions,
    excelColumns,
    fonts,
    handlePositionChange,
    handleColorChange,
    DEFAULT_COLUMN_POSITION,
    loadData,
  } = useImageManager();

  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const colorPickerRefs = useRef({});

  const imagePositions = positions[image] || {};

  useEffect(() => {
    loadData();
  }, [loadData]);

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
