import "./PdfManager.scss";
import { useCallback, useEffect, useState } from "react";
import PdfReplacorModal from "../modals/PdfReplacorModal";
import { useImageManager } from "../../context/AppContext";

const PdfManager = () => {
  const { pdfReplacements, currentExcel } = useImageManager();
  const [pdfs, setPdfs] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    notInExcel: 0,
  });

  const loadPdfs = async () => {
    try {
      const pdfList = await window.Electron.getPdfList();
      setPdfs(pdfList);

      // Excel verilerini yükle
      const data = await window.Electron.getExcelData();
      setExcelData(data);
    } catch (error) {
      console.error("Error loading PDFs:", error);
    }
  };

  useEffect(() => {
    loadPdfs();
  }, []);

  const getActiveFieldCount = useCallback(
    (pdf) => {
      if (!pdfReplacements[pdf]) return 0;
      return Object.values(pdfReplacements[pdf]).filter(Boolean).length;
    },
    [pdfReplacements],
  );

  const isPdfInExcel = useCallback(
    (pdf) => {
      return excelData.some((row) => row.img_path === pdf);
    },
    [excelData],
  );

  useEffect(() => {
    const calculateStats = () => {
      const newStats = {
        total: pdfs.length,
        active: 0,
        inactive: 0,
        notInExcel: 0,
      };

      pdfs.forEach((pdf) => {
        const isInExcel = isPdfInExcel(pdf);

        if (!isInExcel) {
          newStats.notInExcel++;
        } else {
          const activeFields = getActiveFieldCount(pdf);
          if (activeFields > 0) {
            newStats.active++;
          } else {
            newStats.inactive++;
          }
        }
      });

      setStats(newStats);
    };

    calculateStats();
  }, [pdfs, pdfReplacements, getActiveFieldCount, isPdfInExcel]);

  const handleEditClick = (pdf) => {
    setSelectedPdf(pdf);
    setIsModalOpen(true);
  };

  const getStatus = (pdf) => {
    const isInExcel = isPdfInExcel(pdf);
    if (!isInExcel) return "not-in-excel";

    const activeFields = getActiveFieldCount(pdf);
    return activeFields > 0 ? "active" : "inactive";
  };

  return (
    <div className='pdf-manager-container column'>
      <div className='pdf-manager-header row aic jcsb'>
        <h2>PDF Manager</h2>
        <div
          className='stats-container'
          style={{ display: "flex", gap: "10px", marginTop: "10px" }}
        >
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
            <th className='table-title'>PDF Name</th>
            <th className='table-title'>Status</th>
            <th className='table-title'>Actions</th>
          </tr>
        </thead>
        <tbody className='table-body'>
          {pdfs.map((pdf, index) => {
            const status = getStatus(pdf);
            const activeFields = getActiveFieldCount(pdf);
            return (
              <tr
                key={pdf}
                className={`table-row ${
                  status === "inactive" ? "deactivated" : ""
                } ${status === "not-in-excel" ? "unused" : ""}`}
              >
                <td className='id-column'>{index + 1}</td>
                <td>
                  <span
                    className={status === "not-in-excel" ? "line-through" : ""}
                  >
                    {pdf}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${status}`}>
                    {status === "active"
                      ? `${activeFields} Active Fields`
                      : status === "inactive"
                      ? "Inactive"
                      : "Not in Excel"}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleEditClick(pdf)}
                    disabled={status === "not-in-excel"}
                    className='button bluepurple'
                  >
                    Edit Fields
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {isModalOpen && selectedPdf && (
        <PdfReplacorModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPdf(null);
          }}
          pdfName={selectedPdf}
        />
      )}
    </div>
  );
};

export default PdfManager;
