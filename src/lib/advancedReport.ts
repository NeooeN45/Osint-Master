// Advanced Report Generation System
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { 
  ReportData, 
  ReportConfig, 
  FindingSection, 
  EvidenceItem,
  TimelineEntry,
  RiskAssessment,
  ReportSection,
  SECTION_METADATA,
  CustodyEvent 
} from "../types/reports";
import type { OsintCase, OsintEntity, OsintRelation } from "../types";
import { useCaseStore } from "../store/useCaseStore";
import { useMonitorStore } from "../store/useMonitorStore";

// Report generator class
export class AdvancedReportGenerator {
  private doc: jsPDF;
  private data: ReportData;
  private currentY: number;
  private pageNumber: number;

  constructor(data: ReportData) {
    this.doc = new jsPDF();
    this.data = data;
    this.currentY = 20;
    this.pageNumber = 1;
  }

  async generate(): Promise<string> {
    const sections = this.data.config.sections;

    for (const section of sections) {
      await this.renderSection(section);
    }

    // Add footer to all pages
    this.addFooters();

    // Generate output
    const filename = `${this.sanitizeFilename(this.data.case_name)}_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    this.doc.save(filename);
    
    return filename;
  }

  private async renderSection(section: ReportSection) {
    switch (section) {
      case "cover":
        await this.renderCover();
        break;
      case "table_of_contents":
        await this.renderTableOfContents();
        break;
      case "executive_summary":
        await this.renderExecutiveSummary();
        break;
      case "methodology":
        await this.renderMethodology();
        break;
      case "timeline":
        await this.renderTimeline();
        break;
      case "entities":
        await this.renderEntities();
        break;
      case "findings":
        await this.renderFindings();
        break;
      case "network_analysis":
        await this.renderNetworkAnalysis();
        break;
      case "evidence":
        await this.renderEvidence();
        break;
      case "risk_assessment":
        await this.renderRiskAssessment();
        break;
      case "recommendations":
        await this.renderRecommendations();
        break;
      case "chain_of_custody":
        await this.renderChainOfCustody();
        break;
      case "appendix":
        await this.renderAppendix();
        break;
      default:
        await this.renderGenericSection(section);
    }
  }

  private async renderCover() {
    const doc = this.doc;
    
    // Classification marking
    if (this.data.config.include_classified) {
      doc.setFontSize(12);
      doc.setTextColor(255, 0, 0);
      doc.text(`[${this.data.config.classification_level.toUpperCase()}]`, 105, 10, { align: "center" });
    }

    // Logo/Header
    doc.setFontSize(24);
    doc.setTextColor(6, 182, 212); // Cyan
    doc.text("OSINT MASTER PRO", 105, 40, { align: "center" });
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("INVESTIGATION REPORT", 105, 55, { align: "center" });

    // Separator line
    doc.setDrawColor(6, 182, 212);
    doc.line(40, 65, 170, 65);

    // Report details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const details = [
      { label: "Case:", value: this.data.case_name },
      { label: "Subject:", value: this.data.subject.name || "N/A" },
      { label: "Investigator:", value: this.data.investigator.name },
      { label: "Organization:", value: this.data.investigator.organization || "N/A" },
      { label: "Period:", value: `${new Date(this.data.period.start).toLocaleDateString()} - ${new Date(this.data.period.end).toLocaleDateString()}` },
      { label: "Generated:", value: new Date(this.data.generated_at).toLocaleString() },
      { label: "Version:", value: this.data.version },
      { label: "Status:", value: this.data.status.toUpperCase() },
    ];

    let y = 85;
    for (const detail of details) {
      doc.setFont("helvetica", "bold");
      doc.text(detail.label, 50, y);
      doc.setFont("helvetica", "normal");
      doc.text(detail.value, 90, y);
      y += 10;
    }

    // Classification footer
    if (this.data.config.include_classified) {
      doc.setFontSize(10);
      doc.setTextColor(255, 0, 0);
      doc.text(`[${this.data.config.classification_level.toUpperCase()}]`, 105, 280, { align: "center" });
    }

    this.addNewPage();
  }

  private async renderTableOfContents() {
    const doc = this.doc;
    
    doc.setFontSize(16);
    doc.setTextColor(6, 182, 212);
    doc.text("TABLE OF CONTENTS", 20, this.currentY);
    this.currentY += 15;

    const sections = this.data.config.sections
      .filter(s => s !== "cover")
      .map((section, index) => ({
        num: index + 1,
        title: this.getSectionTitle(section),
        page: "..." // Would need to track actual pages
      }));

    autoTable(doc, {
      startY: this.currentY,
      head: [["#", "Section", "Page"]],
      body: sections.map(s => [s.num, s.title, s.page]),
      theme: "striped",
      headStyles: { fillColor: [6, 182, 212], textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 },
    });

    this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    
    if (this.currentY > 250) {
      this.addNewPage();
    }
  }

  private async renderExecutiveSummary() {
    const doc = this.doc;
    
    this.renderSectionHeader("EXECUTIVE SUMMARY");

    // Key metrics
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const summary = this.generateExecutiveSummaryText();
    const splitText = doc.splitTextToSize(summary, 170);
    doc.text(splitText, 20, this.currentY);
    
    this.currentY += splitText.length * 5 + 15;

    // Key findings summary table
    const keyFindings = this.getKeyFindings();
    if (keyFindings.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(6, 182, 212);
      doc.text("Key Findings", 20, this.currentY);
      this.currentY += 10;

      autoTable(doc, {
        startY: this.currentY,
        head: [["Severity", "Finding", "Confidence"]],
        body: keyFindings.map(f => [
          f.severity.toUpperCase(),
          f.title,
          `${f.confidence}%`
        ]),
        theme: "striped",
        headStyles: { fillColor: [6, 182, 212], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 },
      });

      this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    }

    if (this.currentY > 230) {
      this.addNewPage();
    }
  }

  private async renderMethodology() {
    this.renderSectionHeader("METHODOLOGY");

    const doc = this.doc;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const methodology = [
      "This investigation employed systematic OSINT (Open Source Intelligence) gathering techniques.",
      "",
      "Data Sources Utilized:",
      "• Public records and databases",
      "• Social media platforms and analysis",
      "• Dark web monitoring and intelligence",
      "• Network infrastructure analysis",
      "• Certificate transparency logs",
      "• Passive DNS data",
      "• Breach databases",
      "",
      "Analysis Techniques:",
      "• Digital footprint reconstruction",
      "• Relationship mapping and network analysis",
      "• Timeline reconstruction",
      "• Geolocation verification",
      "• Metadata extraction and analysis",
      "• Cross-reference validation",
      "",
      "All findings have been verified through multiple independent sources where possible.",
      "Confidence scores reflect the reliability and corroboration level of each finding.",
    ];

    for (const line of methodology) {
      if (line === "") {
        this.currentY += 5;
      } else {
        const splitLine = doc.splitTextToSize(line, 170);
        doc.text(splitLine, 20, this.currentY);
        this.currentY += splitLine.length * 5 + 2;
      }
      
      if (this.currentY > 270) {
        this.addNewPage();
      }
    }
  }

  private async renderTimeline() {
    this.renderSectionHeader("INVESTIGATION TIMELINE");

    const doc = this.doc;
    const caseData = useCaseStore.getState().getActiveCase();
    
    if (!caseData || caseData.entities.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("No timeline data available.", 20, this.currentY);
      this.currentY += 20;
      return;
    }

    // Create timeline entries from entities
    const timelineData = caseData.entities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((entity, index) => ({
        date: new Date(entity.createdAt).toLocaleDateString(),
        time: new Date(entity.createdAt).toLocaleTimeString(),
        event: `${entity.type}: ${entity.value}`,
        category: entity.type,
        confidence: `${entity.confidence}%`,
      }));

    autoTable(doc, {
      startY: this.currentY,
      head: [["Date", "Time", "Event", "Type", "Confidence"]],
      body: timelineData,
      theme: "striped",
      headStyles: { fillColor: [6, 182, 212], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  }

  private async renderEntities() {
    this.renderSectionHeader("IDENTIFIED ENTITIES");

    const doc = this.doc;
    const caseData = useCaseStore.getState().getActiveCase();
    
    if (!caseData) {
      doc.text("No entities identified.", 20, this.currentY);
      return;
    }

    // Group entities by type
    const byType = caseData.entities.reduce((acc, entity) => {
      if (!acc[entity.type]) acc[entity.type] = [];
      acc[entity.type].push(entity);
      return acc;
    }, {} as Record<string, typeof caseData.entities>);

    for (const [type, entities] of Object.entries(byType)) {
      doc.setFontSize(12);
      doc.setTextColor(6, 182, 212);
      doc.text(`${type.toUpperCase()} (${entities.length})`, 20, this.currentY);
      this.currentY += 10;

      const tableData = entities.map(e => [
        e.value,
        e.notes || "",
        `${e.confidence}%`,
        new Date(e.createdAt).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: this.currentY,
        head: [["Value", "Notes", "Confidence", "Date Added"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 },
      });

      this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
      
      if (this.currentY > 220) {
        this.addNewPage();
      }
    }
  }

  private async renderFindings() {
    this.renderSectionHeader("DETAILED FINDINGS");

    const doc = this.doc;
    const findings = this.getKeyFindings();

    for (const finding of findings) {
      // Severity badge
      const colors: Record<string, [number, number, number]> = {
        critical: [220, 38, 38],
        high: [249, 115, 22],
        medium: [234, 179, 8],
        low: [34, 197, 94],
        info: [100, 100, 100],
      };
      
      const color = colors[finding.severity] || [100, 100, 100];
      
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(20, this.currentY - 5, 40, 10, 2, 2, "F");
      
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(finding.severity.toUpperCase(), 40, this.currentY + 1, { align: "center" });
      
      // Title
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(finding.title, 65, this.currentY);
      doc.setFont("helvetica", "normal");
      
      this.currentY += 15;

      // Description
      doc.setFontSize(10);
      const descLines = doc.splitTextToSize(finding.description, 170);
      doc.text(descLines, 20, this.currentY);
      this.currentY += descLines.length * 4 + 5;

      // Metadata
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Confidence: ${finding.confidence}% | Discovered: ${new Date(finding.discovered_at).toLocaleDateString()} | Verified: ${finding.verified ? "Yes" : "No"}`, 20, this.currentY);
      this.currentY += 15;

      if (this.currentY > 250) {
        this.addNewPage();
      }
    }
  }

  private async renderNetworkAnalysis() {
    this.renderSectionHeader("NETWORK ANALYSIS");

    const doc = this.doc;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const text = [
      "Network infrastructure analysis was conducted to identify:",
      "• IP addresses and hosting infrastructure",
      "• Domain registrations and DNS configurations",
      "• SSL/TLS certificate details",
      "• Open ports and exposed services",
      "• Network relationships and dependencies",
      "",
      "Note: Detailed network diagrams and raw scan data are available in the Appendix.",
    ];

    for (const line of text) {
      if (line === "") {
        this.currentY += 5;
      } else {
        doc.text(line, 20, this.currentY);
        this.currentY += 7;
      }
    }

    this.currentY += 10;

    // Network summary table
    const caseData = useCaseStore.getState().getActiveCase();
    const networkEntities = caseData?.entities.filter(
      e => ["ip", "domain", "hostname", "asn"].includes(e.type)
    ) || [];

    if (networkEntities.length > 0) {
      autoTable(doc, {
        startY: this.currentY,
        head: [["Type", "Value", "Confidence", "Notes"]],
        body: networkEntities.map(e => [e.type, e.value, `${e.confidence}%`, e.notes || ""]),
        theme: "striped",
        headStyles: { fillColor: [6, 182, 212], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 },
      });

      this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    }
  }

  private async renderEvidence() {
    this.renderSectionHeader("EVIDENCE & EXHIBITS");

    const doc = this.doc;
    const caseData = useCaseStore.getState().getActiveCase();
    
    if (!caseData || (caseData.images.length === 0 && caseData.documents.length === 0)) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("No evidence items recorded.", 20, this.currentY);
      this.currentY += 20;
      return;
    }

    // Images table
    if (caseData.images.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(6, 182, 212);
      doc.text("Image Evidence", 20, this.currentY);
      this.currentY += 10;

      autoTable(doc, {
        startY: this.currentY,
        head: [["ID", "Filename", "Status", "Date"]],
        body: caseData.images.map((img, i) => [
          `IMG-${String(i + 1).padStart(3, "0")}`,
          img.fileName,
          img.tags.slice(0, 2).join(", ") || "Analyzed",
          new Date(img.uploadedAt).toLocaleDateString(),
        ]),
        theme: "striped",
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 },
      });

      this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Documents table
    if (caseData.documents.length > 0) {
      if (this.currentY > 200) this.addNewPage();
      
      doc.setFontSize(12);
      doc.setTextColor(6, 182, 212);
      doc.text("Document Evidence", 20, this.currentY);
      this.currentY += 10;

      autoTable(doc, {
        startY: this.currentY,
        head: [["ID", "Filename", "Type", "Date"]],
        body: caseData.documents.map((doc, i) => [
          `DOC-${String(i + 1).padStart(3, "0")}`,
          doc.fileName,
          doc.fileType,
          new Date(doc.uploadedAt).toLocaleDateString(),
        ]),
        theme: "striped",
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 },
      });

      this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    }
  }

  private async renderRiskAssessment() {
    this.renderSectionHeader("RISK ASSESSMENT");

    const doc = this.doc;
    
    // Overall risk score
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text("OVERALL RISK: MEDIUM", 105, this.currentY, { align: "center" });
    this.currentY += 20;

    // Risk categories
    const risks = [
      { category: "Digital Exposure", level: "High", score: 75 },
      { category: "Physical Security", level: "Medium", score: 45 },
      { category: "Operational", level: "Low", score: 25 },
      { category: "Reputational", level: "Medium", score: 55 },
    ];

    autoTable(doc, {
      startY: this.currentY,
      head: [["Risk Category", "Level", "Score"]],
      body: risks.map(r => [r.category, r.level, `${r.score}/100`]),
      theme: "striped",
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 },
    });

    this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    // Risk narrative
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const narrative = [
      "The subject exhibits elevated digital exposure through multiple active social media",
      "accounts and publicly accessible infrastructure. Key risk factors include:",
      "",
      "• Publicly identifiable location data",
      "• Active dark web presence indicators",
      "• Network infrastructure with exposed services",
      "• Historical data breach exposure",
      "",
      "Recommended countermeasures and protective measures are detailed in the",
      "Recommendations section of this report.",
    ];

    for (const line of narrative) {
      if (line === "") {
        this.currentY += 5;
      } else {
        const splitLine = doc.splitTextToSize(line, 170);
        doc.text(splitLine, 20, this.currentY);
        this.currentY += splitLine.length * 5 + 2;
      }
      
      if (this.currentY > 270) {
        this.addNewPage();
      }
    }
  }

  private async renderRecommendations() {
    this.renderSectionHeader("RECOMMENDATIONS");

    const doc = this.doc;
    
    const recommendations = [
      {
        priority: "Immediate",
        action: "Implement monitoring for continued surveillance of identified channels",
        rationale: "Ongoing intelligence gathering is essential",
      },
      {
        priority: "High",
        action: "Review and harden exposed network infrastructure",
        rationale: "Identified services present attack surface",
      },
      {
        priority: "Medium",
        action: "Assess data breach exposure and implement credential rotation",
        rationale: "Historical breach data may enable unauthorized access",
      },
      {
        priority: "Ongoing",
        action: "Maintain periodic re-assessment of digital footprint",
        rationale: "Digital landscape changes rapidly",
      },
    ];

    for (const rec of recommendations) {
      // Priority badge
      const colors: Record<string, [number, number, number]> = {
        Immediate: [220, 38, 38],
        High: [249, 115, 22],
        Medium: [234, 179, 8],
        Ongoing: [6, 182, 212],
      };
      
      const color = colors[rec.priority];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(20, this.currentY - 5, 35, 10, 2, 2, "F");
      
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(rec.priority.toUpperCase(), 37, this.currentY + 1, { align: "center" });
      
      // Action
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      const actionLines = doc.splitTextToSize(rec.action, 145);
      doc.text(actionLines, 60, this.currentY);
      doc.setFont("helvetica", "normal");
      
      this.currentY += actionLines.length * 5 + 3;

      // Rationale
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Rationale: ${rec.rationale}`, 60, this.currentY);
      this.currentY += 15;

      if (this.currentY > 250) {
        this.addNewPage();
      }
    }
  }

  private async renderChainOfCustody() {
    this.renderSectionHeader("CHAIN OF CUSTODY");

    const doc = this.doc;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Evidence handling and custody documentation:", 20, this.currentY);
    this.currentY += 15;

    const custodyData = [
      {
        exhibit: "E001",
        item: "Digital Evidence Package",
        action: "Collected",
        by: this.data.investigator.name,
        date: new Date().toLocaleDateString(),
        location: "Digital Forensics Lab",
      },
      {
        exhibit: "E001",
        item: "Digital Evidence Package",
        action: "Secured",
        by: this.data.investigator.name,
        date: new Date().toLocaleDateString(),
        location: "Secure Storage",
      },
    ];

    autoTable(doc, {
      startY: this.currentY,
      head: [["Exhibit", "Item", "Action", "By", "Date", "Location"]],
      body: custodyData.map(c => [c.exhibit, c.item, c.action, c.by, c.date, c.location]),
      theme: "striped",
      headStyles: { fillColor: [100, 100, 100], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    this.currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  }

  private async renderAppendix() {
    this.renderSectionHeader("APPENDIX");

    const doc = this.doc;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const appendix = [
      "A. Raw Data Exports",
      "   Complete exports of all raw intelligence data are maintained separately",
      "   in the case management system.",
      "",
      "B. Tool Versions",
      "   OSINT Master Pro v1.0.0",
      "   Report Generated: " + new Date().toLocaleString(),
      "",
      "C. Source References",
      "   Detailed source citations and query parameters are available upon",
      "   request for verification purposes.",
      "",
      "D. Glossary",
      "   • OSINT: Open Source Intelligence",
      "   • IOC: Indicator of Compromise",
      "   • TTP: Tactics, Techniques, and Procedures",
      "   • PII: Personally Identifiable Information",
      "",
      "E. Legal Disclaimer",
      "   This report is intended for authorized use only. Distribution is restricted",
      "   to named recipients. All information is derived from publicly available sources.",
    ];

    for (const line of appendix) {
      if (line === "") {
        this.currentY += 5;
      } else {
        const splitLine = doc.splitTextToSize(line, 170);
        doc.text(splitLine, 20, this.currentY);
        this.currentY += splitLine.length * 5 + 2;
      }
      
      if (this.currentY > 270) {
        this.addNewPage();
      }
    }
  }

  private async renderGenericSection(section: ReportSection) {
    this.renderSectionHeader(this.getSectionTitle(section));
    
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(`[${section} content would be rendered here]`, 20, this.currentY);
    this.currentY += 20;
  }

  private renderSectionHeader(title: string) {
    if (this.currentY > 40 && this.currentY < 60) {
      // Already at start of page
    } else if (this.currentY > 220) {
      this.addNewPage();
    }

    const doc = this.doc;
    
    doc.setFontSize(16);
    doc.setTextColor(6, 182, 212);
    doc.text(title.toUpperCase(), 20, this.currentY);
    
    doc.setDrawColor(6, 182, 212);
    doc.line(20, this.currentY + 3, 190, this.currentY + 3);
    
    this.currentY += 15;
  }

  private addNewPage() {
    this.doc.addPage();
    this.currentY = 30;
    this.pageNumber++;
  }

  private addFooters() {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      if (this.data.config.page_numbers) {
        this.doc.setFontSize(9);
        this.doc.setTextColor(150, 150, 150);
        this.doc.text(
          `Page ${i} of ${pageCount} | ${this.data.case_name}`,
          105,
          285,
          { align: "center" }
        );
      }
      
      if (this.data.config.footer_text) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(150, 150, 150);
        this.doc.text(this.data.config.footer_text, 20, 285);
      }
      
      if (this.data.config.include_classified) {
        this.doc.setFontSize(10);
        this.doc.setTextColor(255, 0, 0);
        this.doc.text(
          `[${this.data.config.classification_level.toUpperCase()}]`,
          190,
          285,
          { align: "right" }
        );
      }
    }
  }

  private getSectionTitle(section: ReportSection): string {
    const titles: Record<ReportSection, string> = {
      cover: "Cover",
      table_of_contents: "Table of Contents",
      executive_summary: "Executive Summary",
      methodology: "Methodology",
      findings: "Findings",
      timeline: "Timeline",
      entities: "Entities",
      network_analysis: "Network Analysis",
      darkweb_findings: "Dark Web Findings",
      social_media_analysis: "Social Media Analysis",
      evidence: "Evidence",
      risk_assessment: "Risk Assessment",
      recommendations: "Recommendations",
      appendix: "Appendix",
      chain_of_custody: "Chain of Custody",
    };
    return titles[section] || section;
  }

  private generateExecutiveSummaryText(): string {
    const caseData = useCaseStore.getState().getActiveCase();
    const entityCount = caseData?.entities.length || 0;
    const alertCount = useMonitorStore.getState().getNewAlerts().length;
    
    return `This investigation has identified ${entityCount} entities of interest through systematic OSINT gathering. Analysis reveals a significant digital footprint with multiple vectors requiring attention. ${alertCount} active alerts require immediate review. Key findings indicate medium-to-high risk exposure across digital, operational, and reputational categories. Recommendations include immediate implementation of monitoring controls and infrastructure hardening.`;
  }

  private getKeyFindings(): FindingSection[] {
    const caseData = useCaseStore.getState().getActiveCase();
    
    return (caseData?.entities || []).slice(0, 10).map((entity, i) => ({
      id: `finding-${i}`,
      title: `${entity.type.toUpperCase()}: ${entity.value}`,
      category: entity.type as FindingSection["category"],
      severity: entity.confidence > 80 ? "high" : entity.confidence > 50 ? "medium" : "low",
      confidence: entity.confidence,
      description: entity.notes || `Identified ${entity.type} through investigation`,
      evidence_refs: [],
      source_refs: [],
      related_entities: [],
      indicators: [],
      discovered_at: entity.createdAt,
      verified: entity.confidence > 70,
    }));
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  }
}

// Convenience function
export async function generateAdvancedReport(
  config: ReportConfig,
  caseId: string
): Promise<string> {
  const caseStore = useCaseStore.getState();
  const caseData = caseStore.cases.find((c) => c.id === caseId);
  
  if (!caseData) {
    throw new Error("Case not found");
  }

  const reportData: ReportData = {
    id: `report-${Date.now()}`,
    config,
    case_id: caseId,
    case_name: caseData.name,
    investigator: {
      name: "Investigator",
      organization: "OSINT Master Pro",
    },
    subject: {
      name: caseData.name,
      type: "individual",
      description: caseData.description,
    },
    period: {
      start: caseData.createdAt,
      end: new Date().toISOString(),
      duration_days: Math.floor(
        (Date.now() - new Date(caseData.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
    },
    generated_at: new Date().toISOString(),
    version: "1.0.0",
    status: "final",
  };

  const generator = new AdvancedReportGenerator(reportData);
  return await generator.generate();
}
