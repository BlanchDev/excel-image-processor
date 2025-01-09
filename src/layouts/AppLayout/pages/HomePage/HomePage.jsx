import { useState, useEffect, useCallback } from "react";
import {
  useFilePaths,
  useImageManager,
  useStatus,
} from "../context/AppContext";
import "./HomePage.scss";

function HomePage() {
  const [processing, setProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState("");
  const [imageScale, setImageScale] = useState(1);
  const [previews, setPreviews] = useState(new Map());
  const [outputs, setOutputs] = useState([]);
  const [loadedFonts, setLoadedFonts] = useState(new Set());
  const [selectedPreview, setSelectedPreview] = useState(null);

  const { status, setStatus } = useStatus();
  const { paths, currentExcel } = useFilePaths();
  const { loadData, positions } = useImageManager();

  // Font yükleme fonksiyonu
  const loadFont = useCallback(
    async (fontFileName) => {
      if (!fontFileName || fontFileName === "not-set") {
        return { family: "Arial" };
      }

      if (loadedFonts.has(fontFileName)) {
        const fontInfo = await window.Electron.getFontFamily(fontFileName);
        return fontInfo;
      }

      try {
        const fontPath = await window.Electron.getFontPath(fontFileName);
        const fontInfo = await window.Electron.getFontFamily(fontFileName);

        if (fontPath && fontInfo) {
          const font = new FontFace(fontInfo.family, `url(${fontPath})`);
          await font.load();
          document.fonts.add(font);
          setLoadedFonts((prev) => new Set([...prev, fontFileName]));
          console.log(`Font loaded: ${fontFileName} as ${fontInfo.family}`);
          return fontInfo;
        }
        return { family: "Arial" };
      } catch (error) {
        console.error(`Error loading font ${fontFileName}:`, error);
        return { family: "Arial" };
      }
    },
    [loadedFonts],
  );

  // Önizleme oluşturma fonksiyonu
  const createPreview = async (imageName, imageData, positions, excelData) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    await new Promise((resolve) => {
      img.onload = async () => {
        const scale = (await window.Electron.getStore("imageScale")) || 1;

        // Orijinal boyut veya scale uygulanmış boyut
        const targetWidth = scale === 0 ? img.width : img.width * scale;
        const targetHeight = scale === 0 ? img.height : img.height * scale;

        // Önce tam boyutta canvas oluştur
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Scale'i uygula (0 ise 1 kullan)
        const useScale = scale === 0 ? 1 : scale;
        ctx.scale(useScale, useScale);

        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        ctx.drawImage(img, 0, 0);

        // Her sütun için metin ekle
        for (const [column, pos] of Object.entries(positions)) {
          if (!pos.isEnabled || column === "img_path") continue;

          let text = excelData ? String(excelData[column] || column) : column;

          // Font ayarlarını yap
          let fontInfo = { family: "Arial" };
          if (pos.fontFamily) {
            try {
              fontInfo = await loadFont(pos.fontFamily);
              console.log("Using font:", fontInfo.family);
            } catch (error) {
              console.error("Font loading error:", error);
              text = "Font Error: " + text;
            }
          }

          // Font ayarlarını yap
          const fontSize = pos.fontSize || 12;
          ctx.font = `${fontSize}px "${fontInfo.family}"`;
          console.log("Font string:", ctx.font);
          ctx.textBaseline = "top";

          // Letter spacing için her karakteri ayrı çiz
          let currentX = pos.x / useScale; // Scale'e göre pozisyonu ayarla
          const spacing = 0.5;

          // Önce arkaplanı çiz
          const totalWidth =
            ctx.measureText(text).width + (text.length - 1) * spacing;
          const textHeight = fontSize;

          ctx.fillStyle = `rgba(${pos.backgroundColor.r}, ${pos.backgroundColor.g}, ${pos.backgroundColor.b}, ${pos.backgroundColor.a})`;
          ctx.fillRect(currentX, pos.y / useScale, totalWidth, textHeight);

          // Sonra her karakteri çiz
          ctx.fillStyle = `rgba(${pos.color.r}, ${pos.color.g}, ${pos.color.b}, ${pos.color.a})`;

          for (let char of text) {
            ctx.fillText(char, currentX, pos.y / useScale);
            currentX += ctx.measureText(char).width + spacing;
          }
        }

        // Preview için küçült
        const previewCanvas = document.createElement("canvas");
        const previewCtx = previewCanvas.getContext("2d");
        const previewScale = 0.25;

        previewCanvas.width = targetWidth * previewScale;
        previewCanvas.height = targetHeight * previewScale;

        previewCtx.scale(previewScale, previewScale);
        previewCtx.drawImage(canvas, 0, 0);

        resolve();
      };
      img.src = imageData;
    });

    // Preview için küçültülmüş canvas'ı değil, orijinal canvas'ı dön
    return canvas.toDataURL("image/png");
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (status?.message) {
      setLastMessage(status.message);
    }
  }, [status]);

  useEffect(() => {
    window.Electron.getStore("imageScale").then((scale) => {
      setImageScale(scale ?? 0);
    });
  }, []);

  // Output dosyalarını yükle
  const loadOutputs = async () => {
    try {
      const outputFiles = await window.Electron.getOutputFiles();
      const outputPreviews = [];

      for (const file of outputFiles) {
        const preview = await window.Electron.getOutputPreview(file);
        if (preview) {
          outputPreviews.push({ name: file, preview });
        }
      }

      setOutputs(outputPreviews);
    } catch (error) {
      console.error("Error loading outputs:", error);
    }
  };

  // Her saniye output klasörünü kontrol et
  useEffect(() => {
    loadOutputs(); // İlk yükleme

    const interval = setInterval(() => {
      loadOutputs();
    }, 1000);

    // Cleanup interval
    return () => clearInterval(interval);
  }, []); // Sadece component mount olduğunda çalışsın

  // İşlem tamamlandığında output'ları yükle
  useEffect(() => {
    if (!processing) {
      loadOutputs();
    }
  }, [processing]);

  const handleFileSelection = async () => {
    if (!window.Electron) {
      console.error("Electron not found!");
      return;
    }

    if (!currentExcel) {
      setStatus("Please select an Excel file first!");
      return;
    }

    if (!paths.imagePath) {
      setStatus("Please select an image folder!");
      return;
    }

    try {
      await loadData();
      setProcessing(true);
      setStatus("Creating previews...");

      // Excel verilerini al
      const excelData = await window.Electron.getExcelData();
      const imageList = await window.Electron.getImageList();
      const newPreviews = new Map();

      // Her Excel satırı için önizleme oluştur
      for (const [index, row] of excelData.entries()) {
        const imageName = row.img_path;
        if (!imageName || !imageList.includes(imageName)) continue;

        const imageData = await window.Electron.getImagePreview(imageName);
        if (!imageData) continue;

        const imagePositions = positions[imageName] || {};
        const preview = await createPreview(
          imageName,
          imageData,
          imagePositions,
          row,
        );
        // Benzersiz bir anahtar oluştur (satır indeksi + resim adı)
        const previewKey = `${index + 1}-${imageName}`;
        newPreviews.set(previewKey, preview);
      }

      setPreviews(newPreviews);
      setStatus("Previews created, starting process...");

      // Önizlemeleri kullanarak çıktı al
      const result = await window.Electron.processExcelAndImageWithPreviews(
        Array.from(newPreviews.entries()),
      );

      if (result.success) {
        let statusMessage = `Process completed!\n\n${result.results.length} files saved to: ${result.saveDir}`;
        if (result.errors && result.errors.length > 0) {
          statusMessage += "\n\n\nErrors:\n" + result.errors.join("\n");
        }
        setStatus(statusMessage);
        setPreviews(new Map()); // Preview'leri temizle
        await loadOutputs(); // Output'ları yeniden yükle
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleScaleChange = async (value) => {
    try {
      await window.Electron.setStore("imageScale", value);
      setImageScale(value);
      console.log("Scale saved:", value);
    } catch (error) {
      console.error("Error saving scale:", error);
    }
  };

  const handlePreviewClick = (imageName, preview) => {
    setSelectedPreview({ name: imageName, url: preview });
  };

  return (
    <div className='app-layout-page home-page column aic gap50'>
      <div className='row aic jcsb gap10'>
        <h3>Home Page</h3>
      </div>
      <div className='column aic gap20'>
        <button
          onClick={handleFileSelection}
          disabled={processing || !currentExcel}
          className='button green'
        >
          Start Process{" "}
          {currentExcel ? currentExcel : "No Excel File Selected!"}
        </button>
        {lastMessage && (
          <div style={{ marginTop: "20px", whiteSpace: "pre-line" }}>
            <p>{lastMessage}</p>
          </div>
        )}
      </div>
      <div className='settings-section'>
        <h3>Image Quality Settings</h3>
        <div className='scale-selector'>
          <label>Image Resolution:</label>
          <select
            value={imageScale}
            onChange={(e) => handleScaleChange(Number(e.target.value))}
          >
            <option value={0}>Original Resolution</option>
            <option value={1}>1K Resolution</option>
            <option value={2}>2K Resolution</option>
            <option value={3}>3K Resolution</option>
            <option value={4}>4K Resolution</option>
          </select>
        </div>
      </div>

      {previews.size > 0 && (
        <div className='previews-section'>
          <h3>Previews</h3>
          <div className='previews-grid'>
            {Array.from(previews.entries()).map(([imageName, preview]) => (
              <div
                key={imageName}
                className='preview-item'
                onClick={() => handlePreviewClick(imageName, preview)}
              >
                <h4>{imageName}</h4>
                <div className='image-container'>
                  <img src={preview} alt={imageName} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outputs.length > 0 && (
        <div className='previews-section'>
          <h3>Outputs</h3>
          <div className='previews-grid'>
            {outputs.map(({ name, preview }) => (
              <div
                key={name}
                className='preview-item'
                onClick={() => handlePreviewClick(name, preview)}
              >
                <h4>{name}</h4>
                <div className='image-container'>
                  <img src={preview} alt={name} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPreview && (
        <div
          className='preview-modal-overlay'
          onClick={() => setSelectedPreview(null)}
        >
          <div className='preview-modal'>
            <h3>{selectedPreview.name}</h3>
            <img src={selectedPreview.url} alt={selectedPreview.name} />
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
