import { Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout/AppLayout";
import HomePage from "./layouts/AppLayout/pages/HomePage/HomePage";
import "./App.scss";
import PathsPage from "./layouts/AppLayout/pages/PathsPage/PathsPage";
import ImageManagerPage from "./layouts/AppLayout/pages/ImageManagerPage/ImageManagerPage";
import StorageLogsPage from "./layouts/AppLayout/pages/StorageLogsPage/StorageLogsPage";
import PdfManagerPage from "./layouts/AppLayout/pages/PdfManagerPage/PdfManagerPage";

function App() {
  return (
    <Routes>
      <Route path='/' element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path='/paths' element={<PathsPage />} />
        <Route path='/image-manager' element={<ImageManagerPage />} />
        <Route path='/pdf-manager' element={<PdfManagerPage />} />
        <Route path='/storage-logs' element={<StorageLogsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
