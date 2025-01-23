import { useState, useEffect } from "react";
import { JsonView, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import "./StorageLogsPage.scss";

function StorageLogsPage() {
  const [storeData, setStoreData] = useState({
    imagePositions: null,
    pdfReplacements: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStoreData = async () => {
      try {
        setLoading(true);
        const imagePositions = await window.Electron.getStoreImagePositions();
        const pdfReplacements = await window.Electron.getPdfReplacements();

        setStoreData({
          imagePositions: imagePositions || {},
          pdfReplacements: pdfReplacements || {},
        });
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
          {/* Image Positions Section */}
          <div className='config-section'>
            <div className='w100 h100 row aic jcsb'>
              <h2>Image Positions Store</h2>
            </div>
            {loading ? (
              <div className='info'>Loading...</div>
            ) : error ? (
              <div className='error'>{error}</div>
            ) : Object.keys(storeData.imagePositions || {}).length === 0 ? (
              <div className='info'>No image position data in store</div>
            ) : (
              <div className='json-viewer'>
                <JsonView data={storeData.imagePositions} style={darkStyles} />
              </div>
            )}
          </div>

          {/* PDF Replacements Section */}
          <div className='config-section'>
            <div className='w100 h100 row aic jcsb'>
              <h2>PDF Form Fields Store</h2>
            </div>
            {loading ? (
              <div className='info'>Loading...</div>
            ) : error ? (
              <div className='error'>{error}</div>
            ) : Object.keys(storeData.pdfReplacements || {}).length === 0 ? (
              <div className='info'>No PDF form field data in store</div>
            ) : (
              <div className='json-viewer'>
                <JsonView data={storeData.pdfReplacements} style={darkStyles} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StorageLogsPage;
