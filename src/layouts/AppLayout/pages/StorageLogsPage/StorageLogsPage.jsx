import { useState, useEffect } from "react";
import { JsonView, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import "./StorageLogsPage.scss";

function StorageLogsPage() {
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStoreData = async () => {
      try {
        setLoading(true);
        const imagePositions = await window.Electron.getStoreImagePositions();
        console.log("Loaded image positions:", imagePositions); // Debug log
        setStoreData(imagePositions || {});
      } catch (err) {
        console.error("Error loading store data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStoreData();
  }, []);

  return (
    <div className='app-layout-page'>
      <div className='storage-logs-page'>
        <h1>Storage Logs</h1>
        <div className='storage-logs'>
          <div className='config-section'>
            <h2>Image Positions Store</h2>
            {loading ? (
              <div className='info'>Loading...</div>
            ) : error ? (
              <div className='error'>{error}</div>
            ) : Object.keys(storeData).length === 0 ? (
              <div className='info'>No data in store</div>
            ) : (
              <div className='json-viewer'>
                <JsonView data={storeData} style={darkStyles} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StorageLogsPage;
