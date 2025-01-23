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
  const [outputs, setOutputs] = useState([]);
  const [loadedFonts, setLoadedFonts] = useState(new Set());
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [isLoadingOutputs, setIsLoadingOutputs] = useState(false);
  const [outputPage, setOutputPage] = useState(1);
  const [hasMoreOutputs, setHasMoreOutputs] = useState(true);
  const [totalOutputs, setTotalOutputs] = useState(0);
  const [showOutputs, setShowOutputs] = useState();
  const [isConverting, setIsConverting] = useState(false);
  const outputsPerPage = 22;

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

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, img.width, img.height);

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
          ctx.textBaseline = "top";

          // Letter spacing ayarını uygula
          const letterSpacing = (pos.letterSpacing || 0) * (fontSize / 12); // Font boyutuna göre ölçekle
          if (letterSpacing !== 0) {
            // Letter spacing için metni karakter karakter çiz
            const chars = text.split("");

            // Toplam genişliği hesapla
            let totalWidth = 0;
            const charWidths = chars.map((char) => {
              const width = ctx.measureText(char).width;
              totalWidth += width;
              return width;
            });
            // Son karakter hariç letter spacing ekle
            totalWidth += letterSpacing * (chars.length - 1);

            // Başlangıç X pozisyonunu alignment'a göre ayarla
            let currentX = pos.x;
            if (pos.alignment === "right") {
              currentX = pos.x - totalWidth;
            }

            // Arkaplanı çiz
            ctx.fillStyle = `rgba(${pos.backgroundColor.r}, ${pos.backgroundColor.g}, ${pos.backgroundColor.b}, ${pos.backgroundColor.a})`;
            ctx.fillRect(currentX, pos.y, totalWidth, fontSize);

            // Metni karakter karakter çiz
            ctx.fillStyle = `rgba(${pos.color.r}, ${pos.color.g}, ${pos.color.b}, ${pos.color.a})`;
            chars.forEach((char, index) => {
              ctx.fillText(char, currentX, pos.y);
              currentX +=
                charWidths[index] +
                (index < chars.length - 1 ? letterSpacing : 0);
            });
          } else {
            // Normal metin çizimi (letter spacing olmadan)
            ctx.textAlign = pos.alignment || "left";

            // Metin genişliğini hesapla
            const textWidth = ctx.measureText(text).width;
            const textHeight = fontSize;

            // Arkaplanı çiz
            ctx.fillStyle = `rgba(${pos.backgroundColor.r}, ${pos.backgroundColor.g}, ${pos.backgroundColor.b}, ${pos.backgroundColor.a})`;
            const bgX = ctx.textAlign === "right" ? pos.x - textWidth : pos.x;
            ctx.fillRect(bgX, pos.y, textWidth, textHeight);

            // Metni çiz
            ctx.fillStyle = `rgba(${pos.color.r}, ${pos.color.g}, ${pos.color.b}, ${pos.color.a})`;
            ctx.fillText(text, pos.x, pos.y);
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

    // Dönüşüm durumu dinleyicisini ekle
    window.Electron.onConversionStatus((status) => {
      setStatus(status);
    });
  }, [setStatus]);

  useEffect(() => {
    // Kullanıcının tercihini localStorage'dan al
    const savedShowOutputs = localStorage.getItem("showOutputs");
    if (savedShowOutputs !== null) {
      setShowOutputs(savedShowOutputs === "true");
    }
  }, []);

  // Output dosyalarını yükle
  const loadOutputs = useCallback(
    async (page = 1, shouldAppend = false) => {
      try {
        setIsLoadingOutputs(true);
        const outputFiles = await window.Electron.getOutputFiles();
        setTotalOutputs(outputFiles.length);

        const start = (page - 1) * outputsPerPage;
        // Eğer başlangıç indeksi toplam dosya sayısından büyükse, daha fazla dosya yok demektir
        if (start >= outputFiles.length) {
          setHasMoreOutputs(false);
          return false;
        }

        const end = start + outputsPerPage;
        const currentPageFiles = outputFiles.slice(start, end);

        const outputPreviews = [];
        for (const file of currentPageFiles) {
          const preview = await window.Electron.getOutputPreview(file);
          if (preview) {
            outputPreviews.push({ name: file, preview });
          }
        }

        // Eğer append modundaysa ve aynı dosyalar varsa ekleme
        if (shouldAppend) {
          setOutputs((prev) => {
            const existingNames = new Set(prev.map((p) => p.name));
            const newOutputs = outputPreviews.filter(
              (p) => !existingNames.has(p.name),
            );
            return [...prev, ...newOutputs];
          });
        } else {
          setOutputs(outputPreviews);
        }

        // Son sayfaya gelip gelmediğimizi kontrol et
        const hasMore = end < outputFiles.length;
        setHasMoreOutputs(hasMore);
        return hasMore;
      } catch (error) {
        console.error("Error loading outputs:", error);
        setHasMoreOutputs(false);
        return false;
      } finally {
        setIsLoadingOutputs(false);
      }
    },
    [], // Boş dependency array - fonksiyon asla değişmeyecek
  );

  // İlk yükleme ve periyodik kontrol
  useEffect(() => {
    let mounted = true;
    let intervalId;

    const checkOutputs = async () => {
      if (!mounted) return;

      const prevTotal = totalOutputs;
      const outputFiles = await window.Electron.getOutputFiles();

      // Sadece toplam dosya sayısı değiştiyse yeniden yükle
      if (outputFiles.length !== prevTotal) {
        setHasMoreOutputs(true);
        setOutputPage(1);
        await loadOutputs(1, false);
      }
    };

    // İlk yükleme
    loadOutputs(1, false);

    // Interval başlat
    intervalId = setInterval(checkOutputs, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [loadOutputs, totalOutputs]);

  // Scroll ile daha fazla output yükleme
  const handleOutputScroll = useCallback(
    (e) => {
      const element = e.target;
      const isNearBottom =
        element.scrollHeight - element.scrollTop <= element.clientHeight + 100;

      if (isNearBottom && !isLoadingOutputs && hasMoreOutputs) {
        const nextPage = outputPage + 1;
        loadOutputs(nextPage, true).then((hasMore) => {
          if (hasMore) {
            setOutputPage(nextPage);
          }
        });
      }
    },
    [outputPage, isLoadingOutputs, hasMoreOutputs, loadOutputs],
  );

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
      setStatus("Processing files...");

      // Excel verilerini al
      const excelData = await window.Electron.getExcelData();
      const imageList = await window.Electron.getImageList();
      const pdfList = await window.Electron.getPdfList();
      const newPreviews = new Map();
      const pdfData = [];

      // Her Excel satırı için işlem yap
      let processedImageCount = 0;
      let processedPdfCount = 0;
      let totalRows = excelData.length;

      for (const [index, row] of excelData.entries()) {
        const fileName = row.img_path;
        if (!fileName) continue;

        // Dosya uzantısını kontrol et
        const fileExtension = fileName.toLowerCase().split(".").pop();

        // Görsel dosyası ise
        if (["jpg", "jpeg", "png"].includes(fileExtension)) {
          // Görsel listesinde var mı kontrol et
          if (!imageList.includes(fileName)) {
            continue;
          }

          // Görsel işleme
          const imageData = await window.Electron.getImagePreview(fileName);
          if (imageData) {
            const imagePositions = positions[fileName] || {};
            const preview = await createPreview(
              fileName,
              imageData,
              imagePositions,
              row,
            );
            const previewKey = `${index + 1}-${fileName}`;
            newPreviews.set(previewKey, preview);
            processedImageCount++;
          }
        }
        // PDF dosyası ise
        else if (fileExtension === "pdf") {
          // PDF listesinde var mı kontrol et
          if (!pdfList.includes(fileName)) {
            continue;
          }

          // PDF verilerini hazırla
          pdfData.push({
            pdfName: fileName,
            rowData: row,
            rowIndex: index + 1,
          });
          processedPdfCount++;
        }

        setStatus(
          `Processing files... (${
            index + 1
          }/${totalRows}) - Images: ${processedImageCount}, PDFs: ${processedPdfCount}`,
        );
      }

      setStatus("Saving processed files...");

      let statusMessage = "Process completed!\n\n";
      let hasErrors = false;

      // İşlenecek görsel var mı kontrol et
      if (newPreviews.size > 0) {
        // Process images
        const imageResult =
          await window.Electron.processExcelAndImageWithPreviews(
            Array.from(newPreviews.entries()),
          );

        if (imageResult.success) {
          statusMessage += `${processedImageCount} images processed.\n`;
          if (imageResult.errors?.length > 0) {
            hasErrors = true;
            statusMessage +=
              "\nImage Errors:\n" + imageResult.errors.join("\n");
          }
        } else {
          hasErrors = true;
          statusMessage += `\nImage Error: ${imageResult.error}\n`;
        }
      }

      // İşlenecek PDF var mı kontrol et
      if (pdfData.length > 0) {
        // Process PDFs
        const pdfResult = await window.Electron.processExcelAndPdf(pdfData);

        if (pdfResult.success) {
          statusMessage += `${processedPdfCount} PDFs processed.\n`;
          if (pdfResult.errors?.length > 0) {
            hasErrors = true;
            statusMessage += "\nPDF Errors:\n" + pdfResult.errors.join("\n");
          }
        } else {
          hasErrors = true;
          statusMessage += `\nPDF Error: ${pdfResult.error}\n`;
        }
      }

      if (!hasErrors) {
        statusMessage += `\nFiles saved to: ${paths.outputDir}`;
      }

      setStatus(statusMessage);

      // Reload outputs and show automatically
      await loadOutputs(1, false);
      localStorage.setItem("showOutputs", "true");
      //setShowOutputs(true);
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

  const handleToggleOutputs = useCallback(() => {
    setShowOutputs((prev) => {
      const newValue = !prev;
      localStorage.setItem("showOutputs", newValue);
      return newValue;
    });
  }, []);

  const handlePdfToPngConversion = async () => {
    try {
      setIsConverting(true);
      setStatus("Starting PDF to PNG conversion...");

      const result = await window.Electron.convertPdfToPng();

      if (result.success) {
        if (result.errors.length > 0) {
          setStatus(
            `Conversion completed with some errors:\n${result.errors.join(
              "\n",
            )}`,
          );
        }
        // Reload outputs to show new PNG files
        await loadOutputs(1, false);
      } else {
        setStatus(`Error during conversion: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className='app-layout-page home-page column aic gap20'>
      <div className='column w100 gap10'>
        <div className='w100 row aic jcsb gap10'>
          <h2>Home Page</h2>
        </div>
        <div className='row aic gap20'>
          <button
            onClick={handleFileSelection}
            disabled={processing || !currentExcel}
            className='button green'
          >
            Start Process{" "}
            {currentExcel ? currentExcel : "No Excel File Selected!"}
          </button>
          {lastMessage && (
            <div style={{ whiteSpace: "pre-line" }}>
              <p>{lastMessage}</p>
            </div>
          )}
        </div>
        <div className='settings-section'>
          <h3>Settings</h3>
          <div className='settings-grid'>
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

            <div className='toggle-selector'>
              <label>Show Outputs:</label>
              <div
                className={`toggle-switch ${showOutputs ? "active" : ""}`}
                onClick={handleToggleOutputs}
              >
                <div className='toggle-slider' />
              </div>
            </div>

            <button
              className='button green maxContentW'
              onClick={handlePdfToPngConversion}
              disabled={isConverting}
            >
              {isConverting ? "Converting..." : "PDF to PNG"}
            </button>
          </div>
        </div>
      </div>

      <div className='previews-section'>
        <h3>
          Outputs (Showing {showOutputs ? outputs.length : 0} of {totalOutputs})
        </h3>
        {showOutputs && outputs.length > 0 && (
          <div
            className='previews-grid'
            onScroll={handleOutputScroll}
            style={{ maxHeight: "600px", overflowY: "auto" }}
          >
            {outputs.map(({ name, preview }) => (
              <div
                key={name}
                className='preview-item'
                onClick={() => handlePreviewClick(name, preview)}
              >
                <h4>{name}</h4>
                <div className='image-container'>
                  <img loading='lazy' src={preview} alt={name} />
                </div>
              </div>
            ))}
            {isLoadingOutputs && (
              <div className='loading-indicator'>Loading more outputs...</div>
            )}
            {!isLoadingOutputs && !hasMoreOutputs && outputs.length > 0 && (
              <div className='loading-indicator'>No more outputs to load.</div>
            )}
          </div>
        )}
      </div>

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
