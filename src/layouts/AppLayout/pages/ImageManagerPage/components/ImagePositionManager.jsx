import { useImageManager } from "../../context/AppContext";
import "./ImagePositionManager.scss";
import { useEffect, useState } from "react";
import CoordinatesModal from "../modals/CoordinatesModal";

function ImagePositionManager() {
  const [showCoordinatesModal, setShowCoordinatesModal] = useState(false);

  const { images, positions, excelImagePaths, loadData, currentExcel } =
    useImageManager();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEnabledColumnsCount = (image) => {
    if (!positions[image]) return 0;
    return Object.values(positions[image]).filter((col) => col.isEnabled)
      .length;
  };

  return (
    <div className='image-position-manager-container column'>
      <div className='image-position-manager-header row aic'>
        <h3>Image Positions ({currentExcel})</h3>
      </div>

      <table className='table'>
        <thead className='table-header'>
          <tr>
            <th className='table-title'>
              Images ({images.length}) <h5>({currentExcel})</h5>
            </th>
            <th className='table-title'>Column Settings</th>
          </tr>
        </thead>
        <tbody className='table-body'>
          {images.map((image, index) => {
            const enabledColumns = getEnabledColumnsCount(image);
            const isInExcel = excelImagePaths.includes(image);

            return (
              <tr
                key={image}
                className={`table-row ${
                  enabledColumns === 0 && "deactivated"
                } ${!isInExcel && "unused"}`}
              >
                <td>
                  <span
                    className={`table-row-index ${
                      enabledColumns === 0 && "deactivated"
                    } ${!isInExcel && "unused"}`}
                  >
                    {index + 1})
                  </span>{" "}
                  <span className={!isInExcel ? "line-through" : ""}>
                    {image}
                  </span>
                </td>
                <td>
                  <button
                    className='button bluepurple'
                    onClick={() =>
                      setShowCoordinatesModal({
                        image,
                      })
                    }
                    disabled={!isInExcel}
                  >
                    {isInExcel
                      ? `${enabledColumns} Active Columns`
                      : "Not in Excel"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* MODALS */}
      {showCoordinatesModal && (
        <CoordinatesModal
          onClose={() => setShowCoordinatesModal(false)}
          image={showCoordinatesModal.image}
        />
      )}
    </div>
  );
}

export default ImagePositionManager;
