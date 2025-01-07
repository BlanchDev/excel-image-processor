import { useState, useEffect } from "react";
import {
  useFilePaths,
  useImageManager,
  useStatus,
} from "../context/AppContext";

function HomePage() {
  const [processing, setProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState("");

  const { status, setStatus } = useStatus();
  const { paths, currentExcel } = useFilePaths();

  const { loadData } = useImageManager();

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (status?.message) {
      setLastMessage(status.message);
    }
  }, [status]);

  const handleFileSelection = async () => {
    if (!window.Electron) {
      console.error("Electron not found!");
      return;
    }

    if (!currentExcel) {
      setStatus("Please select an Excel file first!");
      return;
    }

    if (!paths.imagePath) {
      setStatus("Please select an image folder!");
      return;
    }

    try {
      await loadData();
      setProcessing(true);
      setStatus("Process started...");

      const result = await window.Electron.processExcelAndImage();

      if (result.success) {
        let statusMessage = `Process completed!\n\n${result.results.length} files saved to: ${result.saveDir}`;

        if (result.errors && result.errors.length > 0) {
          statusMessage += "\n\n\nErrors:\n" + result.errors.join("\n");
        }

        setStatus(statusMessage);
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className='app-layout-page column aic gap50'>
      <div className='row aic jcsb gap10'>
        <h3>Home Page</h3>
      </div>
      <div className='column aic gap20'>
        <button
          onClick={handleFileSelection}
          disabled={processing}
          className='button green'
        >
          Start Process
        </button>
        {lastMessage && (
          <div style={{ marginTop: "20px", whiteSpace: "pre-line" }}>
            <p>{lastMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
