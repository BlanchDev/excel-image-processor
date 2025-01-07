import { createContext, useContext } from "react";

export const FilePathsContext = createContext();
export const useFilePaths = () => useContext(FilePathsContext);

export const StatusContext = createContext();
export const useStatus = () => useContext(StatusContext);

export const ImageManagerContext = createContext();
export const useImageManager = () => useContext(ImageManagerContext);
