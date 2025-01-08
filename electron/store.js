import Store from "electron-store";

const store = new Store({
  defaults: {
    paths: {
      excelFolderPath: "",
      imagePath: "",
      outputDir: "",
      fontPath: "",
    },
    activeExcelFile: "",
    imagePositions: {},
    imageScale: 1,
  },
});

export const registerStoreHandlers = (ipcMain) => {
  ipcMain.handle("get-store", (event, key) => {
    return store.get(key);
  });

  ipcMain.handle("set-store", (event, key, value) => {
    store.set(key, value);
    return true;
  });
};

export default store;
