// ============ ADVANCED REPORT SYSTEM TYPES ============

export type ReportTemplate = 
  | "executive_summary"
  | "full_investigation"
  | "technical_findings"
  | "legal_compliance"
  | "incident_response"
  | "threat_assessment"
  | "asset_inventory";

export type ReportSection = 
  | "cover"
  | "table_of_contents"
  | "executive_summary"
  | "methodology"
  | "findings"
  | "timeline"
  | "entities"
  | "network_analysis"
  | "darkweb_findings"
  | "social_media_analysis"
  | "evidence"
  | "risk_assessment"
  | "recommendations"
  | "appendix"
  | "chain_of_custody";

export interface ReportConfig {
  id: string;
  name: string;
  template: ReportTemplate;
  sections: ReportSection[];
  include_classified: boolean;
  classification_level: "unclassified" | "confidential" | "secret" | "top_secret";
  watermark?: string;
  header_logo?: string;
  footer_text?: string;
  page_numbers: boolean;
  date_format: string;
  language: "fr" | "en" | "de" | "es";
  evidence_attachments: boolean;
  include_raw_data: boolean;
  sign_off_required: boolean;
}

export interface ReportData {
  id: string;
  config: ReportConfig;
  case_id: string;
  case_name: string;
  investigator: {
    name: string;
    title?: string;
    organization?: string;
    contact?: string;
    badge_number?: string;
  };
  client?: {
    name: string;
    organization?: string;
    contact?: string;
  };
  subject: {
    name?: string;
    aliases?: string[];
    type?: "individual" | "organization" | "infrastructure" | "incident";
    description?: string;
  };
  period: {
    start: string;
    end: string;
    duration_days: number;
  };
  generated_at: string;
  version: string;
  status: "draft" | "review" | "final" | "archived";
  signatures?: ReportSignature[];
}

export interface ReportSignature {
  id: string;
  role: "investigator" | "supervisor" | "client" | "legal";
  name: string;
  title?: string;
  signed_at?: string;
  signature_image?: string;
  digital_signature_hash?: string;
}

export interface FindingSection {
  id: string;
  title: string;
  category: 
    | "identity"
    | "location"
    | "digital_assets"
    | "network"
    | "communications"
    | "financial"
    | "associations"
    | "timeline_event"
    | "darkweb"
    | "vulnerability";
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: number;
  description: string;
  evidence_refs: string[];
  source_refs: string[];
  related_entities: string[];
  indicators: string[];
  recommendations?: string[];
  discovered_at: string;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface EvidenceItem {
  id: string;
  type: 
    | "screenshot"
    | "document"
    | "image"
    | "network_capture"
    | "database_export"
    | "social_media_post"
    | "darkweb_page"
    | "certificate"
    | "whois_record"
    | "dns_record"
    | "passive_dns"
    | "ssl_scan"
    | "vulnerability_scan"
    | "geolocation"
    | "communication_record";
  title: string;
  description?: string;
  source_url?: string;
  captured_at: string;
  captured_by: string;
  hash_md5?: string;
  hash_sha256?: string;
  file_path?: string;
  file_size?: number;
  metadata: Record<string, unknown>;
  chain_of_custody: CustodyEvent[];
  exhibit_number?: string;
}

export interface CustodyEvent {
  id: string;
  timestamp: string;
  action: "collected" | "transferred" | "analyzed" | "stored" | "accessed";
  performed_by: string;
  location: string;
  notes?: string;
}

export interface TimelineEntry {
  id: string;
  timestamp: string;
  end_timestamp?: string;
  title: string;
  description: string;
  category: "event" | "communication" | "location" | "digital" | "financial" | "relationship";
  entities_involved: string[];
  evidence_refs: string[];
  source_confidence: number;
  verified: boolean;
}

export interface RiskAssessment {
  overall_score: number;
  overall_level: "critical" | "high" | "medium" | "low" | "minimal";
  categories: Array<{
    name: string;
    score: number;
    level: string;
    findings: string[];
    mitigations: string[];
  }>;
  threat_actors?: string[];
  attack_vectors?: string[];
  impact_assessment?: {
    financial?: string;
    reputational?: string;
    operational?: string;
    legal?: string;
  };
}

export interface NetworkGraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    properties: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
    properties: Record<string, unknown>;
  }>;
}

export interface ExportOptions {
  format: "pdf" | "html" | "docx" | "json" | "markdown";
  password?: string;
  encrypt: boolean;
  compression: boolean;
  include_attachments: boolean;
  redact_classified: boolean;
  watermark?: string;
}

export const REPORT_TEMPLATES: Record<ReportTemplate, {
  name: string;
  description: string;
  default_sections: ReportSection[];
  icon: string;
}> = {
  executive_summary: {
    name: "Executive Summary",
    description: "High-level overview for decision makers",
    default_sections: ["cover", "executive_summary", "findings", "risk_assessment", "recommendations"],
    icon: "file-text",
  },
  full_investigation: {
    name: "Full Investigation Report",
    description: "Comprehensive report with all details",
    default_sections: [
      "cover", "table_of_contents", "executive_summary", "methodology",
      "timeline", "entities", "findings", "network_analysis", "evidence",
      "risk_assessment", "recommendations", "appendix"
    ],
    icon: "file-stack",
  },
  technical_findings: {
    name: "Technical Findings",
    description: "Technical details for security teams",
    default_sections: ["cover", "methodology", "network_analysis", "darkweb_findings", "evidence", "appendix"],
    icon: "terminal",
  },
  legal_compliance: {
    name: "Legal/Compliance Report",
    description: "Formatted for legal proceedings",
    default_sections: ["cover", "chain_of_custody", "methodology", "findings", "evidence", "appendix"],
    icon: "scale",
  },
  incident_response: {
    name: "Incident Response",
    description: "Focused on security incidents",
    default_sections: ["cover", "executive_summary", "timeline", "findings", "risk_assessment", "recommendations"],
    icon: "alert-triangle",
  },
  threat_assessment: {
    name: "Threat Assessment",
    description: "Threat actor and risk analysis",
    default_sections: ["cover", "executive_summary", "darkweb_findings", "social_media_analysis", "risk_assessment", "recommendations"],
    icon: "shield-alert",
  },
  asset_inventory: {
    name: "Asset Inventory",
    description: "Complete asset and infrastructure list",
    default_sections: ["cover", "network_analysis", "entities", "evidence"],
    icon: "database",
  },
};

export const SECTION_METADATA: Record<ReportSection, {
  title: string;
  description: string;
  required_data: string[];
}> = {
  cover: {
    title: "Cover Page",
    description: "Report title, case info, classification",
    required_data: ["case_name", "investigator", "period"],
  },
  table_of_contents: {
    title: "Table of Contents",
    description: "Auto-generated navigation",
    required_data: [],
  },
  executive_summary: {
    title: "Executive Summary",
    description: "Key findings and recommendations",
    required_data: ["findings", "risk_assessment"],
  },
  methodology: {
    title: "Methodology",
    description: "Investigation approach and tools",
    required_data: ["investigator"],
  },
  findings: {
    title: "Findings",
    description: "Detailed investigation results",
    required_data: ["findings"],
  },
  timeline: {
    title: "Timeline",
    description: "Chronological event reconstruction",
    required_data: ["timeline"],
  },
  entities: {
    title: "Entities",
    description: "People, organizations, assets identified",
    required_data: ["entities"],
  },
  network_analysis: {
    title: "Network Analysis",
    description: "Infrastructure and connections",
    required_data: ["network_graph"],
  },
  darkweb_findings: {
    title: "Dark Web Findings",
    description: "Dark web intelligence results",
    required_data: ["darkweb_results"],
  },
  social_media_analysis: {
    title: "Social Media Analysis",
    description: "Social media intelligence",
    required_data: ["social_profiles"],
  },
  evidence: {
    title: "Evidence",
    description: "Exhibits and supporting documentation",
    required_data: ["evidence_items"],
  },
  risk_assessment: {
    title: "Risk Assessment",
    description: "Risk analysis and scoring",
    required_data: ["risk_assessment"],
  },
  recommendations: {
    title: "Recommendations",
    description: "Actionable next steps",
    required_data: ["findings"],
  },
  appendix: {
    title: "Appendix",
    description: "Supporting materials and raw data",
    required_data: [],
  },
  chain_of_custody: {
    title: "Chain of Custody",
    description: "Evidence handling documentation",
    required_data: ["evidence_items"],
  },
};

// Report generation status
export interface ReportGenerationStatus {
  id: string;
  status: "queued" | "generating" | "completed" | "failed";
  progress: number;
  current_section?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  output_url?: string;
  file_size?: number;
  checksum?: string;
}
