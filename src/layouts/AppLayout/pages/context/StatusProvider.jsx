import { useMemo, useState } from "react";
import { StatusContext } from "./AppContext";
import PropTypes from "prop-types";
import "./StatusProvider.scss";

function StatusProvider({ children }) {
  const [status, setStatus] = useState({ message: "", type: "" });

  const setStatusWithType = (message, type = "success") => {
    setStatus({ message, type });
    // 3 saniye sonra mesajı temizle
    setTimeout(() => {
      setStatus({ message: "", type: "" });
    }, 3000);
  };

  const value = useMemo(
    () => ({
      status,
      setStatus: (message) => {
        // Mesaj tipini belirle
        let type = "success";
        if (
          message.toLowerCase().includes("reset") ||
          message.toLowerCase().includes("not selected") ||
          message.toLowerCase().includes("error") ||
          message.toLowerCase().includes("failed")
        ) {
          type = "error";
        } else if (message.toLowerCase().includes("warning")) {
          type = "warning";
        }
        setStatusWithType(message, type);
      },
    }),
    [status],
  );

  return (
    <StatusContext.Provider value={value}>
      {children}
      {status.message && (
        <div className={`status-message ${status.type}`}>{status.message}</div>
      )}
    </StatusContext.Provider>
  );
}

StatusProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default StatusProvider;
