import { useState, useRef } from "react";
import { 
  Clock, 
  Search, 
  Filter, 
  Calendar,
  Globe,
  Image as ImageIcon,
  FileText,
  Link2,
  MoreHorizontal,
  Star,
  Trash2,
  ExternalLink,
  ChevronDown,
  Hash,
  User,
  MapPin
} from "lucide-react";
import { PanelSection } from "./ProLayout";

export interface HistoryItem {
  id: string;
  type: "page" | "image" | "document" | "entity" | "search" | "note";
  title: string;
  url?: string;
  source: string;
  timestamp: string;
  favicon?: string;
  thumbnail?: string;
  tags: string[];
  caseId: string;
  metadata?: {
    domain?: string;
    author?: string;
    location?: string;
    extractedEntities?: string[];
  };
  annotations?: Array<{
    id: string;
    text: string;
    highlight?: string;
    timestamp: string;
  }>;
  starred?: boolean;
}

interface VisualHistoryProps {
  items: HistoryItem[];
  onItemClick?: (item: HistoryItem) => void;
  onItemDelete?: (id: string) => void;
  onItemStar?: (id: string, starred: boolean) => void;
  onFilterChange?: (filters: HistoryFilters) => void;
}

export interface HistoryFilters {
  types: HistoryItem["type"][];
  dateRange: "all" | "today" | "week" | "month";
  searchQuery: string;
  starredOnly: boolean;
  caseId?: string;
}

export default function VisualHistory({
  items,
  onItemClick,
  onItemDelete,
  onItemStar,
  onFilterChange,
}: VisualHistoryProps) {
  const [filters, setFilters] = useState<HistoryFilters>({
    types: [],
    dateRange: "all",
    searchQuery: "",
    starredOnly: false,
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["today"]));
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Group items by date
  const groupedItems = groupItemsByDate(items);

  const handleFilterChange = (newFilters: Partial<HistoryFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getTypeIcon = (type: HistoryItem["type"]) => {
    switch (type) {
      case "page": return <Globe className="w-3.5 h-3.5 text-blue-400" />;
      case "image": return <ImageIcon className="w-3.5 h-3.5 text-purple-400" />;
      case "document": return <FileText className="w-3.5 h-3.5 text-yellow-400" />;
      case "entity": return <User className="w-3.5 h-3.5 text-green-400" />;
      case "search": return <Search className="w-3.5 h-3.5 text-cyan-400" />;
      case "note": return <FileText className="w-3.5 h-3.5 text-slate-400" />;
      default: return <Globe className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-accent-cyan" />
            Visual History
          </h3>
          <span className="text-[10px] text-slate-500">{items.length} items</span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search history..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-2 border border-border rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
          />
        </div>

        {/* Filters */}
        <PanelSection title="Filters" defaultExpanded={false}>
          <div className="space-y-2">
            {/* Type Filter */}
            <div className="flex flex-wrap gap-1">
              {(["page", "image", "document", "entity", "search"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    const newTypes = filters.types.includes(type)
                      ? filters.types.filter((t) => t !== type)
                      : [...filters.types, type];
                    handleFilterChange({ types: newTypes });
                  }}
                  className={`px-2 py-1 rounded text-[10px] capitalize transition-colors ${
                    filters.types.includes(type)
                      ? "bg-accent-cyan/20 text-accent-cyan"
                      : "bg-surface-2 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Date Range */}
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange({ dateRange: e.target.value as HistoryFilters["dateRange"] })}
              className="w-full px-2 py-1.5 bg-surface-2 border border-border rounded text-xs text-white focus:outline-none focus:border-accent-cyan"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            {/* Starred Only */}
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.starredOnly}
                onChange={(e) => handleFilterChange({ starredOnly: e.target.checked })}
                className="rounded border-border bg-surface-2 text-accent-cyan focus:ring-accent-cyan"
              />
              Starred only
            </label>
          </div>
        </PanelSection>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedItems).map(([groupId, group]) => (
          <div key={groupId} className="border-b border-border last:border-0">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(groupId)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-2/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400 uppercase">{group.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-surface-2 text-slate-500 rounded">
                  {group.items.length}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform ${expandedGroups.has(groupId) ? "" : "-rotate-90"}`} />
            </button>

            {/* Group Items */}
            {expandedGroups.has(groupId) && (
              <div className="px-2 pb-2 space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item.id);
                      onItemClick?.(item);
                    }}
                    className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      selectedItem === item.id
                        ? "bg-accent-cyan/10 border border-accent-cyan/30"
                        : "hover:bg-surface-2 border border-transparent"
                    }`}
                  >
                    {/* Icon/Thumbnail */}
                    <div className="flex-shrink-0 w-8 h-8 rounded bg-surface-2 flex items-center justify-center overflow-hidden">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getTypeIcon(item.type)
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs text-slate-300 truncate font-medium">{item.title}</h4>
                        {item.starred && (
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-500 truncate">{item.source}</span>
                        <span className="text-[9px] text-slate-600">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[8px] px-1.5 py-0.5 bg-surface-2 text-slate-400 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="text-[8px] text-slate-500">+{item.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Annotations indicator */}
                      {item.annotations && item.annotations.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-[9px] text-accent-cyan">
                          <FileText className="w-3 h-3" />
                          {item.annotations.length} note{item.annotations.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemStar?.(item.id, !item.starred);
                        }}
                        className={`p-1 rounded hover:bg-surface-3 ${item.starred ? "text-yellow-400" : "text-slate-500"}`}
                      >
                        <Star className={`w-3 h-3 ${item.starred ? "fill-yellow-400" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.url) window.open(item.url, "_blank");
                        }}
                        className="p-1 rounded hover:bg-surface-3 text-slate-500"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemDelete?.(item.id);
                        }}
                        className="p-1 rounded hover:bg-surface-3 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to group items by date
function groupItemsByDate(items: HistoryItem[]): Record<string, { label: string; items: HistoryItem[] }> {
  const groups: Record<string, { label: string; items: HistoryItem[] }> = {
    today: { label: "Today", items: [] },
    yesterday: { label: "Yesterday", items: [] },
    thisWeek: { label: "This Week", items: [] },
    lastWeek: { label: "Last Week", items: [] },
    thisMonth: { label: "This Month", items: [] },
    older: { label: "Older", items: [] },
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  items.forEach((item) => {
    const itemDate = new Date(item.timestamp);
    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

    if (itemDay.getTime() === today.getTime()) {
      groups.today.items.push(item);
    } else if (itemDay.getTime() === yesterday.getTime()) {
      groups.yesterday.items.push(item);
    } else if (itemDay >= thisWeekStart) {
      groups.thisWeek.items.push(item);
    } else if (itemDay >= lastWeekStart) {
      groups.lastWeek.items.push(item);
    } else if (itemDay >= thisMonthStart) {
      groups.thisMonth.items.push(item);
    } else {
      groups.older.items.push(item);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, group]) => group.items.length > 0)
  );
}

// Generate sample history items for demo
export function generateSampleHistory(): HistoryItem[] {
  const now = new Date();
  const items: HistoryItem[] = [
    {
      id: "1",
      type: "page",
      title: "LinkedIn Profile - John Doe",
      url: "https://linkedin.com/in/johndoe",
      source: "linkedin.com",
      timestamp: now.toISOString(),
      tags: ["social", "profile"],
      caseId: "case-1",
      metadata: { domain: "linkedin.com" },
    },
    {
      id: "2",
      type: "search",
      title: "OSINT framework tools",
      source: "google.com",
      timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      tags: ["research"],
      caseId: "case-1",
    },
    {
      id: "3",
      type: "image",
      title: "Satellite imagery - Location X",
      source: "google.com/maps",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
      tags: ["geo", "satellite"],
      caseId: "case-1",
      starred: true,
    },
    {
      id: "4",
      type: "entity",
      title: "Email: john.doe@example.com",
      source: "hunter.io",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
      tags: ["email", "contact"],
      caseId: "case-1",
    },
    {
      id: "5",
      type: "document",
      title: "Company Registration PDF",
      source: "opencorporates.com",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(),
      tags: ["document", "company"],
      caseId: "case-1",
      annotations: [
        { id: "a1", text: "Registered address matches target location", timestamp: now.toISOString() },
      ],
    },
    {
      id: "6",
      type: "page",
      title: "Twitter Profile Analysis",
      url: "https://twitter.com/johndoe",
      source: "twitter.com",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      tags: ["social", "twitter"],
      caseId: "case-1",
    },
  ];
  return items;
}
