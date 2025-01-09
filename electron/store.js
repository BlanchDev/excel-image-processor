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
    imageScale: 0,
  },
});

export const registerStoreHandlers = (ipcMain) => {
  // Get store value
  ipcMain.handle("get-store", async (event, key) => {
    return store.get(key);
  });

  // Set store value
  ipcMain.handle("set-store", async (event, key, value) => {
    store.set(key, value);
    return true;
  });
};

export default store;
