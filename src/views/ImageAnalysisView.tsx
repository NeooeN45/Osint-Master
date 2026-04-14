import { useState, useRef } from "react";
import { 
  Upload, Image, MapPin, Camera, ScanFace, 
  Eye, Trash2, Download, Search, Loader2,
  AlertTriangle, CheckCircle, X
} from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";
import { 
  generateThumbnail, 
  extractExifData, 
  detectFaces, 
  calculateFileHash,
  analyzeImageWithMistral 
} from "../lib/imageAnalysis";
import type { AnalyzedImage } from "../types";

export default function ImageAnalysisView() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<AnalyzedImage | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    getActiveCase, 
    addImage, 
    deleteImage, 
    getApiKey: getStoredApiKey,
    findSimilarImages 
  } = useCaseStore();
  
  const activeCase = getActiveCase();
  const mistralKey = apiKey || getStoredApiKey("mistral");
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    await processImages(files);
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    await processImages(files);
  };
  
  const processImages = async (files: File[]) => {
    if (!activeCase || files.length === 0) return;
    
    setIsProcessing(true);
    
    for (const file of files) {
      try {
        // Read file as data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Generate thumbnail
        const thumbnailUrl = await generateThumbnail(dataUrl, 400);
        
        // Extract EXIF
        const exifData = await extractExifData(file);
        
        // Detect faces
        const faceAnalysis = await detectFaces(dataUrl);
        
        // Calculate hash
        const hash = await calculateFileHash(file);
        
        // Add to store
        addImage({
          fileName: file.name,
          dataUrl,
          thumbnailUrl,
          uploadedAt: new Date().toISOString(),
          exifData,
          aiAnalysis: null,
          faceAnalysis,
          similarImages: [],
          tags: [],
          source: "upload",
          notes: `Hash: ${hash}`,
        });
      } catch (error) {
        console.error("Error processing image:", error);
      }
    }
    
    setIsProcessing(false);
  };
  
  const handleAIAnalysis = async (image: AnalyzedImage) => {
    if (!mistralKey) return;
    
    setIsProcessing(true);
    try {
      const analysis = await analyzeImageWithMistral(image.dataUrl, mistralKey);
      
      // Find similar images
      const similar = findSimilarImages(image.id);
      
      // Update image with analysis
      const updatedImage = {
        ...image,
        aiAnalysis: analysis,
        similarImages: similar,
      };
      
      // Update in store
      useCaseStore.getState().updateImage(image.id, updatedImage);
      setSelectedImage(updatedImage);
    } catch (error) {
      console.error("AI analysis error:", error);
    }
    setIsProcessing(false);
  };
  
  const handleDelete = (id: string) => {
    if (confirm("Supprimer cette image ?")) {
      deleteImage(id);
      if (selectedImage?.id === id) setSelectedImage(null);
    }
  };
  
  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        <div className="text-center">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Aucun dossier actif</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanFace className="w-5 h-5 text-accent-cyan" />
          <span className="text-sm font-semibold text-white">Analyse d'Images</span>
          <span className="text-xs text-slate-500 font-mono">
            {activeCase.images.length} images
          </span>
        </div>
        
        {!mistralKey && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400">Clé Mistral requise</span>
            <input
              type="password"
              placeholder="Clé API Mistral"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="px-2 py-1 bg-surface-3 border border-border rounded text-xs text-white font-mono w-40"
            />
          </div>
        )}
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Gallery sidebar */}
        <div className="w-64 border-r border-border bg-surface-1 overflow-y-auto p-3 space-y-3">
          {/* Upload zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              isDragging 
                ? "border-accent-cyan bg-accent-cyan/10" 
                : "border-border hover:border-accent-cyan/50"
            }`}
          >
            <Upload className="w-6 h-6 mx-auto mb-2 text-slate-500" />
            <p className="text-xs text-slate-400">Glissez ou cliquez pour uploader</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          {/* Thumbnails */}
          {activeCase.images.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                selectedImage?.id === img.id 
                  ? "border-accent-cyan" 
                  : "border-border hover:border-accent-cyan/50"
              }`}
            >
              <img 
                src={img.thumbnailUrl} 
                alt={img.fileName}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-xs text-white truncate">{img.fileName}</p>
                <p className="text-[10px] text-slate-400">
                  {img.faceAnalysis?.facesDetected ?? 0} visages
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                className="absolute top-1 right-1 p-1 bg-red-500/20 rounded text-red-400 hover:bg-red-500/40"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        
        {/* Main viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedImage ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Image view */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex items-center justify-center bg-surface-0 p-4">
                  <img 
                    src={selectedImage.dataUrl} 
                    alt={selectedImage.fileName}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
                
                {/* Toolbar */}
                <div className="p-3 border-t border-border bg-surface-1 flex items-center gap-2">
                  <button
                    onClick={() => handleAIAnalysis(selectedImage)}
                    disabled={!mistralKey || isProcessing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-xs hover:bg-accent-cyan/20 disabled:opacity-40"
                  >
                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    Analyser avec IA
                  </button>
                  
                  <a
                    href={selectedImage.dataUrl}
                    download={selectedImage.fileName}
                    className="flex items-center gap-2 px-3 py-1.5 border border-border text-slate-400 rounded-lg text-xs hover:text-white"
                  >
                    <Download className="w-3 h-3" /> Télécharger
                  </a>
                </div>
              </div>
              
              {/* Info panel */}
              <div className="w-80 border-l border-border bg-surface-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* EXIF Data */}
                  {selectedImage.exifData && (
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                        <Camera className="w-4 h-4 text-accent-cyan" /> EXIF
                      </h3>
                      <div className="space-y-1 text-xs">
                        {selectedImage.exifData.camera && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Camera:</span>
                            <span className="text-slate-300">{selectedImage.exifData.camera}</span>
                          </div>
                        )}
                        {selectedImage.exifData.dateTaken && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Date:</span>
                            <span className="text-slate-300">{new Date(selectedImage.exifData.dateTaken).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedImage.exifData.resolution && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Resolution:</span>
                            <span className="text-slate-300">{selectedImage.exifData.resolution}</span>
                          </div>
                        )}
                        {(selectedImage.exifData.gpsLatitude && selectedImage.exifData.gpsLongitude) && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> GPS:
                            </span>
                            <span className="text-accent-cyan font-mono">
                              {selectedImage.exifData.gpsLatitude.toFixed(4)}, {selectedImage.exifData.gpsLongitude.toFixed(4)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Face Analysis */}
                  {selectedImage.faceAnalysis && selectedImage.faceAnalysis.facesDetected > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                        <ScanFace className="w-4 h-4 text-accent-purple" /> 
                        Visages ({selectedImage.faceAnalysis.facesDetected})
                      </h3>
                      <div className="space-y-2">
                        {selectedImage.faceAnalysis.faceDescriptors.map((face, i) => (
                          <div key={face.id} className="bg-surface-2 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Visage #{i + 1}</span>
                              <span className="text-xs text-accent-cyan">{Math.round(face.confidence * 100)}%</span>
                            </div>
                            {selectedImage.faceAnalysis?.ageEstimate && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                Age estimé: {selectedImage.faceAnalysis.ageEstimate} ans
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Analysis */}
                  {selectedImage.aiAnalysis && (
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-accent-green" /> Analyse IA
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedImage.aiAnalysis.description.slice(0, 300)}...
                      </p>
                      {selectedImage.aiAnalysis.objects.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedImage.aiAnalysis.objects.slice(0, 5).map((obj, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 bg-accent-cyan/10 text-accent-cyan rounded">
                              {obj.label} ({Math.round(obj.confidence * 100)}%)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Similar Images */}
                  {selectedImage.similarImages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-accent-yellow" /> 
                        Images similaires ({selectedImage.similarImages.length})
                      </h3>
                      <div className="text-xs text-slate-400">
                        Visages similaires detectes dans d'autres images
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <Image className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Selectionnez une image pour l'analyser</p>
                <p className="text-xs text-slate-500 mt-2">Upload ou selectionnez dans la galerie</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-2 border border-border rounded-xl p-6 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-accent-cyan animate-spin mb-3" />
            <p className="text-sm text-white">Analyse en cours...</p>
          </div>
        </div>
      )}
    </div>
  );
}
