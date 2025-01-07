import ReactDOM from "react-dom/client";
import App from "./App";
import MainAppRouter from "./MainAppRouter";
import "./global.scss";

ReactDOM.createRoot(document.getElementById("root")).render(
  <MainAppRouter>
    <App />
  </MainAppRouter>,
);
