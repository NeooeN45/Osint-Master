import { useState, useRef, useCallback, type ReactNode } from "react";
import { 
  Scissors,
  Highlighter,
  StickyNote,
  Save,
  X,
  Check,
  Type,
  Palette,
  Image as ImageIcon,
  Tag,
  Link2,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { PanelSection } from "./ProLayout";

export interface Clip {
  id: string;
  type: "text" | "image" | "link" | "note";
  content: string;
  sourceUrl?: string;
  sourceTitle?: string;
  timestamp: string;
  caseId: string;
  tags: string[];
  annotations: Annotation[];
  color?: string;
  position?: { x: number; y: number };
}

export interface Annotation {
  id: string;
  type: "highlight" | "note" | "tag";
  content: string;
  position?: { start: number; end: number } | { x: number; y: number };
  color?: string;
  timestamp: string;
}

interface ClipAnnotateProps {
  clips: Clip[];
  onAddClip: (clip: Omit<Clip, "id" | "timestamp">) => void;
  onUpdateClip: (id: string, updates: Partial<Clip>) => void;
  onDeleteClip: (id: string) => void;
  onAddAnnotation: (clipId: string, annotation: Omit<Annotation, "id" | "timestamp">) => void;
}

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fbbf24", bg: "bg-amber-400/20", text: "text-amber-400" },
  { name: "Green", value: "#4ade80", bg: "bg-green-400/20", text: "text-green-400" },
  { name: "Blue", value: "#60a5fa", bg: "bg-blue-400/20", text: "text-blue-400" },
  { name: "Pink", value: "#f472b6", bg: "bg-pink-400/20", text: "text-pink-400" },
  { name: "Purple", value: "#a78bfa", bg: "bg-purple-400/20", text: "text-purple-400" },
  { name: "Red", value: "#f87171", bg: "bg-red-400/20", text: "text-red-400" },
];

export default function ClipAnnotate({
  clips,
  onAddClip,
  onUpdateClip,
  onDeleteClip,
  onAddAnnotation,
}: ClipAnnotateProps) {
  const [activeTab, setActiveTab] = useState<"clips" | "create">("clips");
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [newClipContent, setNewClipContent] = useState("");
  const [newClipType, setNewClipType] = useState<Clip['type']>("text");
  const [newClipTags, setNewClipTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const handleCreateClip = () => {
    if (!newClipContent.trim()) return;

    onAddClip({
      type: newClipType,
      content: newClipContent.trim(),
      sourceUrl: window.location.href,
      sourceTitle: document.title,
      caseId: "current-case",
      tags: newClipTags,
      annotations: [],
      color: selectedColor,
    });

    setNewClipContent("");
    setNewClipTags([]);
    setNewTagInput("");
    setActiveTab("clips");
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !newClipTags.includes(newTagInput.trim())) {
      setNewClipTags([...newClipTags, newTagInput.trim()]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewClipTags(newClipTags.filter((t) => t !== tag));
  };

  const filteredClips = filterTag
    ? clips.filter((c) => c.tags.includes(filterTag))
    : clips;

  const allTags = Array.from(new Set(clips.flatMap((c) => c.tags)));

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-accent-cyan" />
          Clip & Annotate
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("clips")}
            className={`px-2 py-1 rounded text-[10px] transition-colors ${
              activeTab === "clips"
                ? "bg-accent-cyan/10 text-accent-cyan"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Clips ({clips.length})
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-2 py-1 rounded text-[10px] transition-colors ${
              activeTab === "create"
                ? "bg-accent-cyan/10 text-accent-cyan"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            + New
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "clips" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filters */}
          {allTags.length > 0 && (
            <div className="p-3 border-b border-border">
              <PanelSection title="Filter by Tag" defaultExpanded={false}>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFilterTag(null)}
                    className={`px-2 py-1 rounded text-[10px] transition-colors ${
                      filterTag === null
                        ? "bg-accent-cyan/20 text-accent-cyan"
                        : "bg-surface-2 text-slate-500"
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                      className={`px-2 py-1 rounded text-[10px] transition-colors ${
                        filterTag === tag
                          ? "bg-accent-cyan/20 text-accent-cyan"
                          : "bg-surface-2 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </PanelSection>
            </div>
          )}

          {/* Clips List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredClips.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Scissors className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No clips yet</p>
                <p className="text-[10px] mt-1">Create clips from web pages or add notes</p>
              </div>
            ) : (
              filteredClips.map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => setSelectedClip(clip)}
                  className={`group p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedClip?.id === clip.id
                      ? "bg-accent-cyan/5 border-accent-cyan/30"
                      : "bg-surface-2 border-border hover:border-accent-cyan/20"
                  }`}
                >
                  {/* Clip Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {clip.type === "text" && <Type className="w-3 h-3 text-slate-400" />}
                      {clip.type === "image" && <ImageIcon className="w-3 h-3 text-slate-400" />}
                      {clip.type === "link" && <Link2 className="w-3 h-3 text-slate-400" />}
                      {clip.type === "note" && <StickyNote className="w-3 h-3 text-slate-400" />}
                      <span className="text-[10px] text-slate-500 uppercase">{clip.type}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {clip.sourceUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(clip.sourceUrl, "_blank");
                          }}
                          className="p-1 rounded hover:bg-surface-3 text-slate-500"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClip(clip.id);
                        }}
                        className="p-1 rounded hover:bg-surface-3 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Clip Content */}
                  <div className="text-xs text-slate-300 line-clamp-3 mb-2">
                    {clip.content}
                  </div>

                  {/* Tags */}
                  {clip.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {clip.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 bg-surface-3 text-slate-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Annotations Indicator */}
                  {clip.annotations.length > 0 && (
                    <div className="flex items-center gap-1 text-[9px] text-accent-cyan">
                      <Highlighter className="w-3 h-3" />
                      {clip.annotations.length} annotation{clip.annotations.length > 1 ? "s" : ""}
                    </div>
                  )}

                  {/* Source */}
                  {clip.sourceTitle && (
                    <div className="mt-2 text-[9px] text-slate-500 truncate">
                      From: {clip.sourceTitle}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Create New Clip */
        <div className="flex-1 flex flex-col overflow-hidden p-3">
          {/* Type Selector */}
          <div className="flex gap-1 mb-3">
            {(["text", "note", "link", "image"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setNewClipType(type)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] transition-colors ${
                  newClipType === type
                    ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30"
                    : "bg-surface-2 text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                {type === "text" && <Type className="w-3 h-3" />}
                {type === "note" && <StickyNote className="w-3 h-3" />}
                {type === "link" && <Link2 className="w-3 h-3" />}
                {type === "image" && <ImageIcon className="w-3 h-3" />}
                <span className="capitalize">{type}</span>
              </button>
            ))}
          </div>

          {/* Content Input */}
          <textarea
            value={newClipContent}
            onChange={(e) => setNewClipContent(e.target.value)}
            placeholder={`Enter ${newClipType} content...`}
            className="flex-1 min-h-[100px] p-3 bg-surface-2 border border-border rounded-lg text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:border-accent-cyan mb-3"
          />

          {/* Color Selection */}
          <div className="mb-3">
            <label className="text-[10px] text-slate-500 uppercase mb-1.5 block">Highlight Color</label>
            <div className="flex gap-1.5">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    selectedColor === color.value
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Tags Input */}
          <div className="mb-3">
            <label className="text-[10px] text-slate-500 uppercase mb-1.5 block">Tags</label>
            <div className="flex gap-1 flex-wrap mb-2">
              {newClipTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 text-slate-400 rounded text-[10px]"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 px-2 py-1 bg-surface-2 border border-border rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
              />
              <button
                onClick={handleAddTag}
                className="px-2 py-1 bg-accent-cyan/10 text-accent-cyan rounded text-xs hover:bg-accent-cyan/20"
              >
                <Tag className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => setActiveTab("clips")}
              className="flex-1 px-3 py-2 border border-border text-slate-400 rounded-lg text-xs hover:text-slate-300 hover:border-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateClip}
              disabled={!newClipContent.trim()}
              className="flex-1 px-3 py-2 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-xs hover:bg-accent-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save Clip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sample clips for demo
export function generateSampleClips(): Clip[] {
  return [
    {
      id: "1",
      type: "text",
      content: "Subject works at TechCorp as Senior Developer since 2021. Previous employment at DataSystems Inc.",
      sourceUrl: "https://linkedin.com/in/johndoe",
      sourceTitle: "John Doe - LinkedIn",
      timestamp: new Date().toISOString(),
      caseId: "case-1",
      tags: ["employment", "linkedin"],
      annotations: [],
      color: "#fbbf24",
    },
    {
      id: "2",
      type: "note",
      content: "Check company registration documents. Possible shell company connections.",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      caseId: "case-1",
      tags: ["todo", "research"],
      annotations: [
        { id: "a1", type: "note", content: "Priority: High", timestamp: new Date().toISOString(), color: "#f87171" },
      ],
      color: "#f87171",
    },
    {
      id: "3",
      type: "link",
      content: "https://github.com/johndoe/secret-project",
      sourceUrl: "https://github.com/johndoe",
      sourceTitle: "John Doe GitHub",
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      caseId: "case-1",
      tags: ["github", "code"],
      annotations: [],
      color: "#60a5fa",
    },
  ];
}
