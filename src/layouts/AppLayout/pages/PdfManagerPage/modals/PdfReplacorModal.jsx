import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useImageManager } from "../../context/AppContext";
import "./PdfReplacorModal.scss";

const PdfReplacorModal = ({ isOpen, onClose, pdfName }) => {
  const { pdfReplacements, handlePdfReplacementChange } = useImageManager();
  const [excelColumns, setExcelColumns] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Excel sütunlarını yükle
        const columns = await window.Electron.getExcelColumns();
        setExcelColumns(columns || []);

        // PDF form alanlarını yükle
        const result = await window.Electron.getPdfFormFields(pdfName);
        console.log("Form fields result:", result);

        // Eğer fields bir dizi değilse boş dizi kullan
        const fields = Array.isArray(result?.fields) ? result.fields : [];
        setFormFields(fields);

        // PDF önizleme URL'sini al
        const previewUrl = await window.Electron.getPdfPreview(pdfName);
        setPdfPreviewUrl(previewUrl);
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
        setFormFields([]); // Hata durumunda boş dizi
      }
    };

    if (isOpen && pdfName) {
      loadData();
    }
  }, [isOpen, pdfName]);

  if (!isOpen) return null;

  return (
    <div className='pdf-replacor-modal-overlay'>
      <button className='close-overlay-button' onClick={onClose} />
      <div className='pdf-replacor-modal'>
        <div className='pdf-replacor-modal-header row aic jcsb'>
          <h3>PDF Form Fields - {pdfName}</h3>
          <button className='close-button' onClick={onClose}>
            ×
          </button>
        </div>

        <div className='pdf-replacor-modal-content'>
          <table className='pdf-replacor-table'>
            <thead>
              <tr>
                <th>Excel Column</th>
                <th>Form Field</th>
                <th>Field Type</th>
              </tr>
            </thead>
            <tbody>
              {excelColumns.map((column, index) => (
                <tr key={`${column}-${index}`}>
                  <td>{column}</td>
                  <td>
                    <select
                      value={pdfReplacements[pdfName]?.[column] || ""}
                      onChange={(e) =>
                        handlePdfReplacementChange(
                          pdfName,
                          column,
                          e.target.value,
                        )
                      }
                    >
                      <option value=''>*Not Selected*</option>
                      {formFields.map((field, index) => (
                        <option
                          key={`${field.name}-${index}`}
                          value={field.name}
                        >
                          {field.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {formFields.find(
                      (field) =>
                        field.name === pdfReplacements[pdfName]?.[column],
                    )?.type || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pdfPreviewUrl && (
            <div className='pdf-replacor-preview-section'>
              <h3>PDF Preview</h3>
              <div className='preview-container'>
                <iframe
                  src={`${pdfPreviewUrl}#zoom=90&toolbar=1`}
                  title='PDF Preview'
                  width='100%'
                  height='100%'
                  frameBorder='0'
                  allowFullScreen={true}
                  loading='lazy'
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

PdfReplacorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  pdfName: PropTypes.string.isRequired,
};

export default PdfReplacorModal;
