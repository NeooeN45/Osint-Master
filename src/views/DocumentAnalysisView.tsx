import { useState, useRef } from "react";
import { 
  Upload, FileText, Scan, Trash2, Download, 
  Loader2, Eye, FileSearch, Hash, Calendar,
  User, AlertTriangle, CheckCircle, X
} from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";
import { 
  extractTextFromPDF, 
  extractPDFMetadata, 
  extractEntitiesFromText,
  generateDocumentSummary 
} from "../lib/documentAnalysis";
import type { AnalyzedDocument, ExtractedEntity } from "../types";

export default function DocumentAnalysisView() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<AnalyzedDocument | null>(null);
  const [apiKey, setApiKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    getActiveCase, 
    addDocument, 
    deleteDocument,
    getApiKey: getStoredApiKey,
    addEntity 
  } = useCaseStore();
  
  const activeCase = getActiveCase();
  const openrouterKey = apiKey || getStoredApiKey("openrouter");
  
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
    
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type === "application/pdf" || f.type.startsWith("image/")
    );
    await processDocuments(files);
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => 
      f.type === "application/pdf" || f.type.startsWith("image/")
    );
    await processDocuments(files);
  };
  
  const processDocuments = async (files: File[]) => {
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
        
        // Determine file type
        let fileType: "pdf" | "image" | "doc" | "txt" = "pdf";
        if (file.type.startsWith("image/")) fileType = "image";
        else if (file.type === "text/plain") fileType = "txt";
        
        // Extract metadata
        let metadata: Awaited<ReturnType<typeof extractPDFMetadata>> = {
          fileSize: file.size,
          checksum: "",
        };
        
        if (fileType === "pdf") {
          metadata = await extractPDFMetadata(file);
        }
        
        // Extract text via OCR
        let ocrText = "";
        try {
          ocrText = await extractTextFromPDF(file);
        } catch (e) {
          console.log("OCR failed, using fallback:", e);
        }
        
        // Extract entities
        const extractedEntities = extractEntitiesFromText(ocrText);
        
        // Generate summary if API key available
        let summary = "";
        if (openrouterKey && ocrText.length > 100) {
          try {
            summary = await generateDocumentSummary(ocrText, openrouterKey);
          } catch (e) {
            console.log("Summary generation failed:", e);
          }
        }
        
        // Add to store
        addDocument({
          fileName: file.name,
          fileType,
          dataUrl,
          uploadedAt: new Date().toISOString(),
          ocrText,
          metadata: {
            ...metadata,
            fileSize: file.size,
            checksum: metadata.checksum || "",
          },
          extractedEntities,
          summary: summary || undefined,
          tags: [],
          pageCount: metadata.pageCount,
        });
        
        // Add extracted entities to case
        extractedEntities.forEach(entity => {
          addEntity({
            type: entity.type,
            value: entity.value,
            metadata: { context: entity.context },
            tags: ["extracted", fileType],
            confidence: entity.confidence,
            source: `document:${file.name}`,
          });
        });
      } catch (error) {
        console.error("Error processing document:", error);
      }
    }
    
    setIsProcessing(false);
  };
  
  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce document ?")) {
      deleteDocument(id);
      if (selectedDoc?.id === id) setSelectedDoc(null);
    }
  };
  
  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
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
          <FileSearch className="w-5 h-5 text-accent-cyan" />
          <span className="text-sm font-semibold text-white">Analyse de Documents</span>
          <span className="text-xs text-slate-500 font-mono">
            {activeCase.documents.length} documents
          </span>
        </div>
        
        {!openrouterKey && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400">Clé OpenRouter recommandée</span>
            <input
              type="password"
              placeholder="sk-or-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="px-2 py-1 bg-surface-3 border border-border rounded text-xs text-white font-mono w-40"
            />
          </div>
        )}
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Document list sidebar */}
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
            <p className="text-xs text-slate-400">PDF ou Image</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          {/* Document list */}
          {activeCase.documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedDoc?.id === doc.id 
                  ? "border-accent-cyan bg-accent-cyan/10" 
                  : "border-border hover:border-accent-cyan/50 bg-surface-2"
              }`}
            >
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-accent-cyan mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{doc.fileName}</p>
                  <p className="text-[10px] text-slate-500">
                    {doc.fileType.toUpperCase()} • {Math.round(doc.metadata.fileSize / 1024)}KB
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 bg-surface-3 rounded text-slate-400">
                      {doc.extractedEntities.length} entités
                    </span>
                    {doc.ocrText.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 rounded text-green-400">
                        OCR OK
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                className="absolute top-2 right-2 p-1 opacity-0 hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
        
        {/* Document viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedDoc ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Document preview */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 bg-surface-0 p-4 overflow-auto">
                  {selectedDoc.fileType === "image" ? (
                    <img 
                      src={selectedDoc.dataUrl} 
                      alt={selectedDoc.fileName}
                      className="max-w-full rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="bg-white text-black p-8 rounded-lg shadow-lg max-w-3xl mx-auto min-h-[800px]">
                      <div className="border-b-2 border-gray-200 pb-4 mb-4">
                        <h1 className="text-2xl font-bold">{selectedDoc.fileName}</h1>
                        <p className="text-gray-500 text-sm mt-1">
                          {selectedDoc.pageCount ? `${selectedDoc.pageCount} pages • ` : ""}
                          {Math.round(selectedDoc.metadata.fileSize / 1024)} KB
                        </p>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {selectedDoc.ocrText || "Aucun texte extrait"}
                      </pre>
                    </div>
                  )}
                </div>
                
                {/* Toolbar */}
                <div className="p-3 border-t border-border bg-surface-1 flex items-center gap-2">
                  <a
                    href={selectedDoc.dataUrl}
                    download={selectedDoc.fileName}
                    className="flex items-center gap-2 px-3 py-1.5 border border-border text-slate-400 rounded-lg text-xs hover:text-white"
                  >
                    <Download className="w-3 h-3" /> Télécharger
                  </a>
                </div>
              </div>
              
              {/* Info panel */}
              <div className="w-80 border-l border-border bg-surface-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* Metadata */}
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                      <Hash className="w-4 h-4 text-accent-cyan" /> Métadonnées
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Type:</span>
                        <span className="text-slate-300 uppercase">{selectedDoc.fileType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Taille:</span>
                        <span className="text-slate-300">{Math.round(selectedDoc.metadata.fileSize / 1024)} KB</span>
                      </div>
                      {selectedDoc.metadata.checksum && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hash:</span>
                          <span className="text-slate-300 font-mono">
                            {selectedDoc.metadata.checksum.slice(0, 16)}...
                          </span>
                        </div>
                      )}
                      {selectedDoc.metadata.pageCount && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pages:</span>
                          <span className="text-slate-300">{selectedDoc.metadata.pageCount}</span>
                        </div>
                      )}
                      {selectedDoc.metadata.author && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> Auteur:
                          </span>
                          <span className="text-slate-300">{selectedDoc.metadata.author}</span>
                        </div>
                      )}
                      {selectedDoc.metadata.creationDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Créé:
                          </span>
                          <span className="text-slate-300">
                            {new Date(selectedDoc.metadata.creationDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Extracted Entities */}
                  {selectedDoc.extractedEntities.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                        <Scan className="w-4 h-4 text-accent-purple" /> 
                        Entités extraites ({selectedDoc.extractedEntities.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedDoc.extractedEntities.slice(0, 10).map((entity, i) => (
                          <div key={i} className="bg-surface-2 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-accent-cyan uppercase">{entity.type}</span>
                              <span className="text-[10px] text-slate-500">{entity.confidence}%</span>
                            </div>
                            <p className="text-sm text-white font-mono mt-1">{entity.value}</p>
                            <p className="text-[10px] text-slate-500 truncate mt-1">
                              {entity.context}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Summary */}
                  {selectedDoc.summary && (
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-accent-green" /> Résumé IA
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedDoc.summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Selectionnez un document pour l'analyser</p>
                <p className="text-xs text-slate-500 mt-2">Supporte PDF et images (OCR)</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-2 border border-border rounded-xl p-6 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-accent-cyan animate-spin mb-3" />
            <p className="text-sm text-white">OCR et analyse en cours...</p>
            <p className="text-xs text-slate-500 mt-1">Extraction du texte et des entités</p>
          </div>
        </div>
      )}
    </div>
  );
}
