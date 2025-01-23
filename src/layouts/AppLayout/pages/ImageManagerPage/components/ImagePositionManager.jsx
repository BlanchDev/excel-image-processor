import { useImageManager } from "../../context/AppContext";
import "./ImagePositionManager.scss";
import { useCallback, useEffect, useState } from "react";
import CoordinatesModal from "../modals/CoordinatesModal";

function ImagePositionManager() {
  const [showCoordinatesModal, setShowCoordinatesModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    notInExcel: 0,
  });

  const { images, positions, excelImagePaths, loadData, currentExcel } =
    useImageManager();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEnabledColumnsCount = useCallback(
    (image) => {
      if (!positions[image]) return 0;
      return Object.values(positions[image]).filter((col) => col.isEnabled)
        .length;
    },
    [positions],
  );

  useEffect(() => {
    // İstatistikleri hesapla
    const newStats = {
      total: images.length,
      active: 0,
      inactive: 0,
      notInExcel: 0,
    };

    images.forEach((image) => {
      const enabledColumns = getEnabledColumnsCount(image);
      const isInExcel = excelImagePaths.includes(image);

      if (!isInExcel) {
        newStats.notInExcel++;
      } else if (enabledColumns === 0) {
        newStats.inactive++;
      } else {
        newStats.active++;
      }
    });

    setStats(newStats);
  }, [images, positions, excelImagePaths, getEnabledColumnsCount]);

  return (
    <div className='image-position-manager-container column'>
      <div className='image-position-manager-header row aic jcsb'>
        <h2>Image Manager</h2>
        <div className='stats-container row gap10'>
          <div className='stat-item'>
            <span className='stat-label'>Total:</span>
            <span className='stat-value'>{stats.total}</span>
          </div>
          <div className='stat-item active'>
            <span className='stat-label'>Active:</span>
            <span className='stat-value'>{stats.active}</span>
          </div>
          <div className='stat-item inactive'>
            <span className='stat-label'>Inactive:</span>
            <span className='stat-value'>{stats.inactive}</span>
          </div>
          <div className='stat-item not-in-excel'>
            <span className='stat-label'>Not in Excel:</span>
            <span className='stat-value'>{stats.notInExcel}</span>
          </div>
        </div>
      </div>

      <div className='current-excel'>
        <h3>Current Excel: {currentExcel || "No Excel Selected"}</h3>
      </div>

      <table className='table'>
        <thead className='table-header'>
          <tr>
            <th className='table-title'>#</th>
            <th className='table-title'>Image Name</th>
            <th className='table-title'>Status</th>
            <th className='table-title'>Actions</th>
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
                <td className='id-column'>{index + 1}</td>
                <td>
                  <span className={!isInExcel ? "line-through" : ""}>
                    {image}
                  </span>
                </td>
                <td>
                  <span
                    className={`status-badge ${
                      !isInExcel
                        ? "not-in-excel"
                        : enabledColumns === 0
                        ? "inactive"
                        : "active"
                    }`}
                  >
                    {!isInExcel
                      ? "Not in Excel"
                      : enabledColumns === 0
                      ? "Inactive"
                      : `${enabledColumns} Active Columns`}
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
                    Edit Positions
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
