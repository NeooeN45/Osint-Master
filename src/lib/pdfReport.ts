import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { 
  InvestigationReport, 
  OsintCase, 
  OsintEntity, 
  OsintRelation,
  AnalyzedImage,
  AnalyzedDocument,
  GeneratedProfile 
} from "../types";

// Generate professional investigation report PDF
export async function generateInvestigationReport(
  report: InvestigationReport,
  caseData: OsintCase
): Promise<string> {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(6, 182, 212); // Cyan color
  doc.text("OSINT MASTER", 105, 20, { align: "center" });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("RAPPORT D'INVESTIGATION", 105, 30, { align: "center" });
  
  // Report metadata
  doc.setFontSize(10);
  doc.text(`Titre: ${report.title}`, 20, 45);
  doc.text(`Type: ${report.type.toUpperCase()}`, 20, 52);
  doc.text(`Date: ${new Date(report.createdAt).toLocaleDateString("fr-FR")}`, 20, 59);
  doc.text(`Enquêteur: ${report.createdBy}`, 20, 66);
  doc.text(`Dossier: ${caseData.name}`, 20, 73);
  doc.text(`Statut: ${report.status.toUpperCase()}`, 20, 80);
  
  // Executive Summary
  doc.setFontSize(14);
  doc.setTextColor(6, 182, 212);
  doc.text("RESUME EXECUTIF", 20, 95);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const summary = generateExecutiveSummary(report, caseData);
  const splitSummary = doc.splitTextToSize(summary, 170);
  doc.text(splitSummary, 20, 105);
  
  let yPosition = 105 + splitSummary.length * 5;
  
  // Entities table
  if (caseData.entities.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(6, 182, 212);
    doc.text("ENTITES IDENTIFIEES", 20, yPosition + 10);
    
    const entityData = caseData.entities.map(e => [
      e.type.toUpperCase(),
      e.value,
      `${e.confidence}%`,
      e.source,
    ]);
    
    autoTable(doc, {
      startY: yPosition + 15,
      head: [["Type", "Valeur", "Confiance", "Source"]],
      body: entityData,
      theme: "striped",
      headStyles: { fillColor: [6, 182, 212] },
      styles: { fontSize: 8 },
    });
    
    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }
  
  // Relations table
  if (caseData.relations.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(6, 182, 212);
    doc.text("RELATIONS", 20, yPosition + 10);
    
    const relationData = caseData.relations.map(r => {
      const source = caseData.entities.find(e => e.id === r.sourceId);
      const target = caseData.entities.find(e => e.id === r.targetId);
      return [
        r.type,
        source?.value ?? "?",
        target?.value ?? "?",
        `${r.strength}%`,
      ];
    });
    
    autoTable(doc, {
      startY: yPosition + 15,
      head: [["Type", "Source", "Cible", "Force"]],
      body: relationData,
      theme: "striped",
      headStyles: { fillColor: [139, 92, 246] }, // Purple
      styles: { fontSize: 8 },
    });
    
    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }
  
  // Images section
  if (caseData.images.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(6, 182, 212);
    doc.text("IMAGES ANALYSEES", 20, yPosition + 10);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${caseData.images.length} images dans le dossier`, 20, yPosition + 20);
    
    yPosition += 30;
  }
  
  // Documents section
  if (caseData.documents.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(6, 182, 212);
    doc.text("DOCUMENTS ANALYSES", 20, yPosition + 10);
    
    const docData = caseData.documents.map(d => [
      d.fileName,
      d.fileType.toUpperCase(),
      d.extractedEntities.length.toString(),
      d.metadata.checksum.substring(0, 16) + "...",
    ]);
    
    autoTable(doc, {
      startY: yPosition + 15,
      head: [["Fichier", "Type", "Entites", "Hash"]],
      body: docData,
      theme: "striped",
      headStyles: { fillColor: [34, 197, 94] }, // Green
      styles: { fontSize: 8 },
    });
    
    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }
  
  // Conclusions
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(6, 182, 212);
  doc.text("CONCLUSIONS", 20, yPosition + 10);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  report.conclusions.forEach((conclusion, i) => {
    const splitConclusion = doc.splitTextToSize(`${i + 1}. ${conclusion}`, 170);
    doc.text(splitConclusion, 20, yPosition + 20 + i * 10);
  });
  
  yPosition += 20 + report.conclusions.length * 10;
  
  // Recommendations
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(6, 182, 212);
  doc.text("RECOMMANDATIONS", 20, yPosition + 10);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  report.recommendations.forEach((rec, i) => {
    const splitRec = doc.splitTextToSize(`${i + 1}. ${rec}`, 170);
    doc.text(splitRec, 20, yPosition + 20 + i * 10);
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Rapport généré par OSINT Master - ${new Date().toLocaleString("fr-FR")}`,
    105,
    290,
    { align: "center" }
  );
  
  // Generate data URL
  return doc.output("dataurlstring");
}

// Generate executive summary
function generateExecutiveSummary(report: InvestigationReport, caseData: OsintCase): string {
  const parts = [
    `Ce rapport présente les résultats de l'investigation "${caseData.name}".`,
    ``,
    `Statistiques cles:`,
    `- ${caseData.entities.length} entites identifiees`,
    `- ${caseData.relations.length} relations etablies`,
    `- ${caseData.images.length} images analysees`,
    `- ${caseData.documents.length} documents traites`,
    `- ${caseData.profiles.length} profils generes`,
    ``,
    `Niveau de confiance global: ${calculateOverallConfidence(caseData)}%`,
    ``,
    `Ce rapport contient des informations sensibles. Distribution restreinte.`,
  ];
  
  return parts.join("\n");
}

// Calculate overall confidence
function calculateOverallConfidence(caseData: OsintCase): number {
  if (caseData.entities.length === 0) return 0;
  
  const avgConfidence = caseData.entities.reduce((sum, e) => sum + e.confidence, 0) / caseData.entities.length;
  return Math.round(avgConfidence);
}

// Generate evidence package (ZIP with all data)
export async function generateEvidencePackage(
  caseData: OsintCase
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  
  // Add case metadata
  zip.file("case_metadata.json", JSON.stringify({
    id: caseData.id,
    name: caseData.name,
    description: caseData.description,
    status: caseData.status,
    createdAt: caseData.createdAt,
    updatedAt: caseData.updatedAt,
  }, null, 2));
  
  // Add entities
  zip.file("entities.json", JSON.stringify(caseData.entities, null, 2));
  
  // Add relations
  zip.file("relations.json", JSON.stringify(caseData.relations, null, 2));
  
  // Add images folder
  const imagesFolder = zip.folder("images");
  if (imagesFolder) {
    caseData.images.forEach((img, i) => {
      const base64Data = img.dataUrl.replace(/^data:image\/\w+;base64,/, "");
      imagesFolder.file(`${i}_${img.fileName}`, base64Data, { base64: true });
    });
  }
  
  // Add documents folder
  const docsFolder = zip.folder("documents");
  if (docsFolder) {
    caseData.documents.forEach((doc, i) => {
      const base64Data = doc.dataUrl.replace(/^data:.*?;base64,/, "");
      docsFolder.file(`${i}_${doc.fileName}`, base64Data, { base64: true });
    });
  }
  
  // Generate ZIP
  return zip.generateAsync({ type: "blob" });
}
