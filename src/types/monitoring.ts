// ============ MONITORING & ALERTS TYPES ============

export type MonitorTargetType = 
  | "darkweb_keyword"
  | "darkweb_paste"
  | "social_username"
  | "social_profile"
  | "network_ip"
  | "network_domain"
  | "network_cert"
  | "breach_email"
  | "breach_domain"
  | "ransomware_victim"
  | "telegram_channel"
  | "github_repo"
  | "domain_expiry"
  | "ssl_expiry";

export type MonitorStatus = "active" | "paused" | "error" | "completed";
export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertStatus = "new" | "acknowledged" | "investigating" | "resolved" | "false_positive";

export interface Monitor {
  id: string;
  name: string;
  description?: string;
  target: string;
  target_type: MonitorTargetType;
  sources: string[];
  status: MonitorStatus;
  created_at: string;
  updated_at: string;
  last_check?: string;
  next_check?: string;
  check_interval: number; // minutes
  check_count: number;
  alert_count: number;
  alert_conditions: AlertCondition[];
  notify_channels: NotificationChannel[];
  case_id?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface AlertCondition {
  id: string;
  type: 
    | "new_mention"
    | "content_change"
    | "new_port"
    | "new_service"
    | "cert_expiry"
    | "domain_expiry"
    | "new_breach"
    | "new_paste"
    | "profile_update"
    | "new_post"
    | "new_vulnerability"
    | "reputation_change"
    | "ssl_grade_drop"
    | "availability_change"
    | "new_subdomain"
    | "dns_change";
  severity: AlertSeverity;
  enabled: boolean;
  threshold?: number;
  keywords?: string[];
  cooldown_minutes: number;
}

export interface NotificationChannel {
  id: string;
  type: "email" | "webhook" | "slack" | "discord" | "telegram" | "in_app" | "sound";
  name: string;
  config: Record<string, string>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  monitor_id: string;
  monitor_name: string;
  alert_type: AlertCondition["type"];
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  details: AlertDetails;
  source_data?: Record<string, unknown>;
  timestamp: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  case_id?: string;
  related_entities: string[];
  attachments?: AlertAttachment[];
}

export interface AlertDetails {
  target: string;
  previous_value?: string;
  current_value: string;
  change_type?: "add" | "remove" | "modify";
  location?: string;
  confidence?: number;
  evidence?: string[];
  recommendations?: string[];
}

export interface AlertAttachment {
  id: string;
  type: "screenshot" | "document" | "json" | "csv" | "link";
  name: string;
  url?: string;
  data?: string;
  size?: number;
}

export interface MonitorLog {
  id: string;
  monitor_id: string;
  timestamp: string;
  status: "success" | "error" | "warning";
  message: string;
  duration_ms: number;
  items_checked: number;
  items_found: number;
  error_details?: string;
}

export interface MonitoringStats {
  total_monitors: number;
  active_monitors: number;
  paused_monitors: number;
  error_monitors: number;
  total_alerts: number;
  new_alerts: number;
  alerts_by_severity: Record<AlertSeverity, number>;
  alerts_by_status: Record<AlertStatus, number>;
  checks_today: number;
  checks_this_week: number;
  avg_check_duration: number;
  uptime_percentage: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: "equals" | "contains" | "starts_with" | "ends_with" | "regex" | "gt" | "lt";
    value: string | number;
  }>;
  actions: Array<{
    type: "alert" | "email" | "webhook" | "tag" | "case";
    config: Record<string, string>;
  }>;
  enabled: boolean;
  priority: number;
}

export interface MonitoringPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  target_types: MonitorTargetType[];
  alert_conditions: Partial<AlertCondition>[];
  check_interval: number;
  sources: string[];
}

export const MONITORING_PRESETS: MonitoringPreset[] = [
  {
    id: "darkweb_basic",
    name: "Dark Web Watch",
    description: "Monitor keywords and mentions on dark web",
    icon: "shield",
    target_types: ["darkweb_keyword", "darkweb_paste"],
    check_interval: 60,
    sources: ["ahmia", "darksearch", "pastebin"],
    alert_conditions: [
      { type: "new_mention", severity: "medium", enabled: true, cooldown_minutes: 60 },
      { type: "new_paste", severity: "high", enabled: true, cooldown_minutes: 30 },
    ],
  },
  {
    id: "social_watch",
    name: "Social Media Watch",
    description: "Monitor social media profiles for changes",
    icon: "instagram",
    target_types: ["social_username", "social_profile"],
    check_interval: 120,
    sources: ["instagram", "twitter", "facebook"],
    alert_conditions: [
      { type: "profile_update", severity: "low", enabled: true, cooldown_minutes: 240 },
      { type: "new_post", severity: "info", enabled: false, cooldown_minutes: 60 },
    ],
  },
  {
    id: "network_security",
    name: "Network Security",
    description: "Monitor network infrastructure for security changes",
    icon: "globe",
    target_types: ["network_ip", "network_domain"],
    check_interval: 360,
    sources: ["shodan", "censys", "crtsh"],
    alert_conditions: [
      { type: "new_port", severity: "high", enabled: true, cooldown_minutes: 60 },
      { type: "new_vulnerability", severity: "critical", enabled: true, cooldown_minutes: 0 },
      { type: "ssl_grade_drop", severity: "medium", enabled: true, cooldown_minutes: 1440 },
      { type: "cert_expiry", severity: "high", enabled: true, threshold: 7, cooldown_minutes: 1440 },
    ],
  },
  {
    id: "breach_alert",
    name: "Breach Alert",
    description: "Monitor for new data breaches involving email/domain",
    icon: "alert",
    target_types: ["breach_email", "breach_domain"],
    check_interval: 720,
    sources: ["haveibeenpwned", "dehashed"],
    alert_conditions: [
      { type: "new_breach", severity: "critical", enabled: true, cooldown_minutes: 0 },
    ],
  },
  {
    id: "brand_protection",
    name: "Brand Protection",
    description: "Comprehensive brand monitoring across all channels",
    icon: "shield-check",
    target_types: ["darkweb_keyword", "social_username", "domain_expiry"],
    check_interval: 60,
    sources: ["ahmia", "instagram", "twitter", "whois"],
    alert_conditions: [
      { type: "new_mention", severity: "medium", enabled: true, cooldown_minutes: 30 },
      { type: "domain_expiry", severity: "critical", enabled: true, threshold: 30, cooldown_minutes: 1440 },
    ],
  },
  {
    id: "threat_intel",
    name: "Threat Intelligence",
    description: "Advanced threat monitoring and correlation",
    icon: "radar",
    target_types: ["network_ip", "darkweb_keyword", "ransomware_victim"],
    check_interval: 30,
    sources: ["shodan", "abuseipdb", "greynoise", "ransomwatch"],
    alert_conditions: [
      { type: "reputation_change", severity: "high", enabled: true, cooldown_minutes: 0 },
      { type: "new_vulnerability", severity: "critical", enabled: true, cooldown_minutes: 0 },
    ],
  },
];

// Alert templates
export const ALERT_TEMPLATES: Record<AlertCondition["type"], { title: string; description: string }> = {
  new_mention: {
    title: "New Dark Web Mention",
    description: "Your target has been mentioned in a new dark web source",
  },
  content_change: {
    title: "Content Changed",
    description: "Monitored content has been modified",
  },
  new_port: {
    title: "New Port Opened",
    description: "A new service port has been detected on the target",
  },
  new_service: {
    title: "New Service Detected",
    description: "A new service/version has been identified",
  },
  cert_expiry: {
    title: "Certificate Expiring Soon",
    description: "SSL certificate is approaching expiration",
  },
  domain_expiry: {
    title: "Domain Expiring Soon",
    description: "Domain registration is approaching expiration",
  },
  new_breach: {
    title: "New Data Breach",
    description: "Target appears in a newly discovered data breach",
  },
  new_paste: {
    title: "New Paste Published",
    description: "Target found in a new paste dump",
  },
  profile_update: {
    title: "Profile Updated",
    description: "Social media profile information has changed",
  },
  new_post: {
    title: "New Post Published",
    description: "New content posted on monitored profile",
  },
  new_vulnerability: {
    title: "New Vulnerability Detected",
    description: "A new vulnerability has been identified on the target",
  },
  reputation_change: {
    title: "Reputation Changed",
    description: "IP reputation score or classification has changed",
  },
  ssl_grade_drop: {
    title: "SSL Grade Dropped",
    description: "SSL/TLS configuration grade has degraded",
  },
  availability_change: {
    title: "Availability Changed",
    description: "Target availability status has changed",
  },
  new_subdomain: {
    title: "New Subdomain Discovered",
    description: "A new subdomain has been found via CT logs or DNS",
  },
  dns_change: {
    title: "DNS Record Changed",
    description: "DNS record has been modified",
  },
};
