import FilePathsProvider from "./pages/context/FilePathsProvider";
import StatusProvider from "./pages/context/StatusProvider";
import "./AppLayout.scss";
import { Outlet } from "react-router-dom";
import LeftBar from "./components/LeftBar";
import ImageManagerProvider from "./pages/context/ImageManagerProvider";

function AppLayout() {
  return (
    <div className='app-layout'>
      <StatusProvider>
        <FilePathsProvider>
          <ImageManagerProvider>
            <LeftBar />
            <Outlet />
          </ImageManagerProvider>
        </FilePathsProvider>
      </StatusProvider>
    </div>
  );
}

export default AppLayout;
