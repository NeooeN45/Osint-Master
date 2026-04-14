import { useState } from "react";
import { 
  FileText, Plus, Trash2, Download, Eye, 
  CheckCircle, Clock, AlertTriangle, X,
  FileDown, FileArchive, Shield, Loader2,
  Settings, ChevronDown, ChevronRight,
  LayoutTemplate, FileCheck, ScrollText,
  ShieldAlert, Scale, Network, Globe,
  Briefcase, FileJson, FileCode
} from "lucide-react";
import { toast } from "sonner";
import { useCaseStore } from "../store/useCaseStore";
import { generateAdvancedReport } from "../lib/advancedReport";
import type { InvestigationReport, OsintCase, OsintEntity, AnalyzedImage } from "../types";
import type { ReportConfig, ReportTemplate, ReportSection } from "../types/reports";
import { REPORT_TEMPLATES, SECTION_METADATA } from "../types/reports";

const ADVANCED_TEMPLATES = [
  { value: "executive_summary", label: "Executive Summary", desc: "High-level overview for decision makers", icon: Briefcase },
  { value: "full_investigation", label: "Full Investigation", desc: "Comprehensive report with all details", icon: ScrollText },
  { value: "technical_findings", label: "Technical Findings", desc: "Technical details for security teams", icon: FileCode },
  { value: "legal_compliance", label: "Legal/Compliance", desc: "Formatted for legal proceedings", icon: Scale },
  { value: "incident_response", label: "Incident Response", desc: "Focused on security incidents", icon: ShieldAlert },
  { value: "threat_assessment", label: "Threat Assessment", desc: "Threat actor and risk analysis", icon: Shield },
  { value: "asset_inventory", label: "Asset Inventory", desc: "Complete asset and infrastructure list", icon: Network },
] as const;

export default function ReportsView() {
  const [showCreate, setShowCreate] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState<ReportTemplate>("full_investigation");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<InvestigationReport | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>([
    "cover", "executive_summary", "findings", "timeline", "entities", "evidence", "risk_assessment", "recommendations"
  ]);
  const [classification, setClassification] = useState<ReportConfig["classification_level"]>("confidential");
  const [includeClassified, setIncludeClassified] = useState(false);
  const [watermark, setWatermark] = useState("");
  
  const { 
    getActiveCase, 
    addReport, 
    deleteReport,
    updateReport,
    cases
  } = useCaseStore();
  
  const activeCase = getActiveCase();
  
  const handleCreateReport = async () => {
    if (!activeCase || !reportTitle.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // Create advanced report config
      const config: ReportConfig = {
        id: `config-${Date.now()}`,
        name: reportTitle,
        template: reportType,
        sections: selectedSections,
        include_classified: includeClassified,
        classification_level: classification,
        watermark: watermark || undefined,
        page_numbers: true,
        date_format: "DD/MM/YYYY",
        language: "fr",
        evidence_attachments: true,
        include_raw_data: false,
        sign_off_required: false,
      };

      // Generate the PDF report
      const filename = await generateAdvancedReport(config, activeCase.id);
      
      toast.success(`Report generated: ${filename}`);
      
      // Generate conclusions and recommendations based on case data
      const conclusions = generateConclusions(activeCase);
      const recommendations = generateRecommendations(activeCase);
      
      // Create report object for tracking
      const newReport: Omit<InvestigationReport, "id"> = {
        title: reportTitle,
        type: reportType === "executive_summary" ? "summary" : "full",
        createdAt: new Date().toISOString(),
        createdBy: "Investigateur",
        caseId: activeCase.id,
        sections: [
          {
            id: "summary",
            title: "Résumé exécutif",
            type: "text",
            content: generateExecutiveSummary(activeCase),
            order: 1,
          },
          {
            id: "entities",
            title: "Entités identifiées",
            type: "entities",
            content: `${activeCase.entities.length} entités dans ce dossier`,
            data: activeCase.entities,
            order: 2,
          },
          {
            id: "relations",
            title: "Relations établies",
            type: "relations",
            content: `${activeCase.relations.length} relations analysées`,
            data: activeCase.relations,
            order: 3,
          },
          {
            id: "images",
            title: "Analyse d'images",
            type: "images",
            content: `${activeCase.images.length} images analysées`,
            data: activeCase.images,
            order: 4,
          },
          {
            id: "documents",
            title: "Documents analysés",
            type: "documents",
            content: `${activeCase.documents.length} documents traités`,
            data: activeCase.documents,
            order: 5,
          },
        ],
        evidence: generateEvidenceList(activeCase),
        conclusions,
        recommendations,
        status: "draft",
      };
      
      const reportId = addReport(newReport);
      
      // Reset form
      setReportTitle("");
      setShowCreate(false);
      setShowAdvancedOptions(false);
    } catch (error) {
      console.error("Report generation error:", error);
    }
    
    setIsGenerating(false);
  };
  
  const handleDownloadEvidence = async () => {
    if (!activeCase) return;
    
    toast.info("Evidence package export not yet implemented");
  };
  
  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce rapport ?")) {
      deleteReport(id);
      if (selectedReport?.id === id) {
        setSelectedReport(null);
        setPdfUrl(null);
      }
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
          <FileText className="w-5 h-5 text-accent-cyan" />
          <span className="text-sm font-semibold text-white">Rapports d'investigation</span>
          <span className="text-xs text-slate-500 font-mono">
            {activeCase.reports.length} rapports
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadEvidence}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-1.5 border border-border text-slate-400 rounded-lg text-xs hover:text-white disabled:opacity-40"
          >
            <FileArchive className="w-3.5 h-3.5" />
            Export preuves
          </button>
          
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-xs hover:bg-accent-cyan/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau rapport
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Reports list */}
        <div className="w-80 border-r border-border bg-surface-1 overflow-y-auto p-3 space-y-2">
          {activeCase.reports.map((report) => (
            <div
              key={report.id}
              onClick={() => {
                setSelectedReport(report);
                setPdfUrl(report.pdfUrl || null);
              }}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedReport?.id === report.id 
                  ? "border-accent-cyan bg-accent-cyan/10" 
                  : "border-border hover:border-accent-cyan/50 bg-surface-2"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {report.status === "draft" && <Clock className="w-4 h-4 text-amber-400" />}
                  {report.status === "final" && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {report.status === "archived" && <FileArchive className="w-4 h-4 text-slate-400" />}
                  <div>
                    <p className="text-sm text-white font-medium truncate">{report.title}</p>
                    <p className="text-[10px] text-slate-500">
                      {ADVANCED_TEMPLATES.find((t) => t.value === (report.type as string))?.label || report.type} • 
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                  className="p-1 text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="mt-2 flex items-center gap-2 text-[10px]">
                <span className="text-slate-500">{report.evidence.length} preuves</span>
                <span className="text-slate-500">{report.conclusions.length} conclusions</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Report viewer */}
        <div className="flex-1 overflow-hidden">
          {showCreate ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="bg-surface-2 border border-border rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-white mb-4">Nouveau rapport</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Titre du rapport</label>
                    <input
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="ex: Rapport d'investigation #001"
                      className="w-full px-3 py-2 bg-surface-3 border border-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Report Template</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {ADVANCED_TEMPLATES.map((template) => (
                        <button
                          key={template.value}
                          onClick={() => setReportType(template.value)}
                          className={`w-full p-3 rounded-lg border text-left transition-colors flex items-start gap-3 ${
                            reportType === template.value
                              ? "border-accent-cyan bg-accent-cyan/10"
                              : "border-border hover:border-accent-cyan/50"
                          }`}
                        >
                          <template.icon className="w-5 h-5 text-accent-cyan mt-0.5" />
                          <div>
                            <div className="text-sm text-white">{template.label}</div>
                            <div className="text-xs text-slate-500">{template.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Options Toggle */}
                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                  >
                    {showAdvancedOptions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    Advanced Options
                  </button>

                  {showAdvancedOptions && (
                    <div className="space-y-4 p-3 bg-surface-3 rounded-lg">
                      {/* Classification */}
                      <div>
                        <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                          <Shield className="w-4 h-4" />
                          Classification
                        </label>
                        <select
                          value={classification}
                          onChange={(e) => setClassification(e.target.value as ReportConfig["classification_level"])}
                          className="w-full px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                        >
                          <option value="unclassified">Unclassified</option>
                          <option value="confidential">Confidential</option>
                          <option value="secret">Secret</option>
                          <option value="top_secret">Top Secret</option>
                        </select>
                      </div>

                      {/* Watermark */}
                      <div>
                        <label className="text-sm text-slate-400 mb-1 block">Watermark (optional)</label>
                        <input
                          type="text"
                          value={watermark}
                          onChange={(e) => setWatermark(e.target.value)}
                          placeholder="DRAFT, CONFIDENTIAL, etc."
                          className="w-full px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white placeholder-slate-500"
                        />
                      </div>

                      {/* Section Selection */}
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">Include Sections</label>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {Object.entries(SECTION_METADATA).map(([section, meta]) => (
                            <label key={section} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={selectedSections.includes(section as ReportSection)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSections([...selectedSections, section as ReportSection]);
                                  } else {
                                    setSelectedSections(selectedSections.filter((s) => s !== section));
                                  }
                                }}
                                className="rounded border-border bg-surface-2 text-accent-cyan"
                              />
                              <span className="text-slate-300">{meta.title}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowCreate(false)}
                      className="flex-1 py-2 border border-border text-slate-400 rounded-lg text-sm hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleCreateReport}
                      disabled={!reportTitle.trim() || isGenerating}
                      className="flex-1 py-2 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-sm hover:bg-accent-cyan/20 disabled:opacity-40"
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Génération...</>
                      ) : (
                        "Générer PDF"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedReport && pdfUrl ? (
            <div className="flex-1 h-full">
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title={selectedReport.title}
              />
            </div>
          ) : selectedReport ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedReport.title}</h2>
                    <p className="text-sm text-slate-500">
                      {ADVANCED_TEMPLATES.find((t) => t.value === (selectedReport.type as string))?.label || selectedReport.type} • 
                      Créé le {new Date(selectedReport.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    selectedReport.status === "final" 
                      ? "bg-green-500/10 text-green-400" 
                      : selectedReport.status === "draft"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-slate-500/10 text-slate-400"
                  }`}>
                    {selectedReport.status.toUpperCase()}
                  </span>
                </div>
                
                {/* Conclusions */}
                <div className="bg-surface-2 border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-accent-cyan" /> Conclusions
                  </h3>
                  <ul className="space-y-2">
                    {selectedReport.conclusions.map((conclusion, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-accent-cyan">{i + 1}.</span>
                        {conclusion}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Recommendations */}
                <div className="bg-surface-2 border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-accent-yellow" /> Recommandations
                  </h3>
                  <ul className="space-y-2">
                    {selectedReport.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-accent-yellow">{i + 1}.</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Selectionnez un rapport ou créez-en un nouveau</p>
                <p className="text-xs text-slate-500 mt-2">
                  Les rapports PDF incluent toutes les entités, relations et analyses
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function generateConclusions(caseData: OsintCase | null): string[] {
  if (!caseData) return [];
  
  const conclusions = [
    `Investigation sur "${caseData.name}" comportant ${caseData.entities.length} entités identifiées et ${caseData.relations.length} relations établies.`,
  ];
  
  if (caseData.images.length > 0) {
    conclusions.push(`${caseData.images.length} images analysées pour détection de visages et extraction de métadonnées EXIF.`);
  }
  
  if (caseData.documents.length > 0) {
    conclusions.push(`${caseData.documents.length} documents traités avec extraction OCR et identification d'entités.`);
  }
  
  if (caseData.profiles.length > 0) {
    conclusions.push(`${caseData.profiles.length} profils OSINT générés avec analyse d'empreinte digitale.`);
  }
  
  return conclusions;
}

function generateRecommendations(caseData: OsintCase | null): string[] {
  if (!caseData) return [];
  
  return [
    "Continuer la surveillance des comptes sociaux identifiés.",
    "Vérifier la cohérence des entités extraites des documents.",
    "Explorer les connexions entre les entités à faible confiance.",
    "Documenter toute nouvelle preuve dans le dossier.",
  ];
}

function generateExecutiveSummary(caseData: OsintCase | null): string {
  if (!caseData) return "";
  
  return `Rapport d'investigation pour le dossier "${caseData.name}". ` +
    `Ce dossier contient ${caseData.entities.length} entités, ${caseData.relations.length} relations, ` +
    `${caseData.images.length} images analysées et ${caseData.documents.length} documents traités. ` +
    `Le niveau de confiance global est évalué sur la base des sources croisées.`;
}

function generateEvidenceList(caseData: OsintCase | null) {
  if (!caseData) return [];
  
  return [
    ...caseData.entities.map((e: OsintEntity) => ({
      id: `entity_${e.id}`,
      type: "entity" as const,
      referenceId: e.id,
      description: `${e.type}: ${e.value}`,
      timestamp: e.createdAt,
      confidence: e.confidence,
      hash: "",
    })),
    ...caseData.images.map((img: AnalyzedImage) => ({
      id: `image_${img.id}`,
      type: "image" as const,
      referenceId: img.id,
      description: `Image: ${img.fileName}`,
      timestamp: img.uploadedAt,
      confidence: 95,
      hash: img.notes?.replace("Hash: ", "") || "",
    })),
  ];
}
