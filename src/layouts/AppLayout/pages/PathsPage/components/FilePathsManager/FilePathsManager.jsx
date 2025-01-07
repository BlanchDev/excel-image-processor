import { useFilePaths } from "../../../context/AppContext";
import "./FilePathsManager.scss";

function FilePathsManager() {
  const {
    paths,
    handleResetPaths,
    handleSelectImageFolder,
    handleSelectOutput,
    handleSelectFontFolder,
    handleSelectExcelFolder,
  } = useFilePaths();

  return (
    <div className='file-paths-manager-container column gap20'>
      <div className='row aic jcsb gap10'>
        <h3>Saved Paths:</h3>
      </div>
      <div className='path-item'>
        <span className='path-text' style={{ marginLeft: "10px" }}>
          {paths.excelFolderPath || "Not Selected"}
        </span>
        <button className='button bluepurple' onClick={handleSelectExcelFolder}>
          Select Excel Folder
        </button>
      </div>
      <div className='path-item'>
        <span className='path-text' style={{ marginLeft: "10px" }}>
          {paths.imagePath || "Not Selected"}
        </span>
        <button className='button bluepurple' onClick={handleSelectImageFolder}>
          Select Image Folder
        </button>
      </div>
      <div className='path-item'>
        <span className='path-text' style={{ marginLeft: "10px" }}>
          {paths.fontPath || "Not Selected"}
        </span>
        <button className='button bluepurple' onClick={handleSelectFontFolder}>
          Select Font Folder
        </button>
      </div>
      <div className='path-item'>
        <span className='path-text' style={{ marginLeft: "10px" }}>
          {paths.outputDir || "Not Selected"}
        </span>
        <button className='button bluepurple' onClick={handleSelectOutput}>
          Select Output Folder
        </button>
      </div>
      <div className='row-reverse aic'>
        <button onClick={handleResetPaths} className='button red'>
          Reset Paths
        </button>
      </div>
    </div>
  );
}

export default FilePathsManager;
