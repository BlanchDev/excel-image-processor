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
  },
});

export default store;
