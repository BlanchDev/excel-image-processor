import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useFilePaths } from "../pages/context/AppContext";
import "./LeftBar.scss";

function LeftBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { excelFiles, currentExcel, handleSelectExcelFile } = useFilePaths();

  return (
    <div className='left-bar column jcsb'>
      <div className='column'>
        <NavLink to='/' className='left-bar-link'>
          Home
        </NavLink>
        <NavLink to='/image-manager' className='left-bar-link'>
          Image Manager
        </NavLink>
        {excelFiles.length > 0 && (
          <div className='excel-dropdown'>
            <button
              className='dropdown-trigger row aic jcc'
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {currentExcel || "Select Excel"} ▶
            </button>
            {isDropdownOpen && (
              <div className='dropdown-content'>
                {excelFiles.map((file) => (
                  <button
                    key={file.path}
                    className={`dropdown-item ${
                      file.name === currentExcel ? "active" : ""
                    }`}
                    onClick={() => {
                      handleSelectExcelFile(file.path);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {file.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className='column'>
        <NavLink to='/paths' className='left-bar-link'>
          Paths
        </NavLink>
        <NavLink to='/storage-logs' className='left-bar-link'>
          Storage Logs
        </NavLink>
      </div>
    </div>
  );
}

export default LeftBar;
