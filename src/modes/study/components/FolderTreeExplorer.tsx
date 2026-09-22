import React, { useState, useMemo, useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  BookOpen, 
  Sparkles, 
  Search, 
  X, 
  CheckCircle2, 
  Trash2, 
  ArrowRight,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { LoadedPDF } from '../../../types';

export interface FolderTreeExplorerProps {
  docs: LoadedPDF[];
  activeDocId?: string;
  onSelectDoc: (doc: LoadedPDF) => void;
  onRemoveDoc?: (docId: string, e: React.MouseEvent) => void;
  subjectName?: string;
  subjectColor?: string;
  isCompact?: boolean;
  className?: string;
  showControls?: boolean;
}

export interface TreeFileNode {
  type: 'file';
  id: string;
  name: string;
  fullPath: string;
  depth: number;
  doc: LoadedPDF;
}

export interface TreeFolderNode {
  type: 'folder';
  id: string;
  name: string;
  fullPath: string;
  depth: number;
  folders: TreeFolderNode[];
  files: TreeFileNode[];
  totalFileCount: number;
}

function getFileIcon(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.epub')) {
    return <BookOpen className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />;
  }
  if (lower.endsWith('.cbz') || lower.endsWith('.cbr') || lower.endsWith('.cbn')) {
    return <Sparkles className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />;
  }
  return <FileText className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />;
}

export const FolderTreeExplorer: React.FC<FolderTreeExplorerProps> = ({
  docs,
  activeDocId,
  onSelectDoc,
  onRemoveDoc,
  subjectName,
  isCompact = false,
  className = '',
  showControls = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // Build recursive tree from flat docs array
  const { rootFolder, allFolderPaths } = useMemo(() => {
    const root: TreeFolderNode = {
      type: 'folder',
      id: 'root',
      name: subjectName || 'Documents',
      fullPath: '',
      depth: 0,
      folders: [],
      files: [],
      totalFileCount: 0,
    };

    const folderMap = new Map<string, TreeFolderNode>();
    folderMap.set('', root);
    const paths = new Set<string>();

    // Helper to get or create folder node
    const getOrCreateFolder = (folderPath: string, depth: number): TreeFolderNode => {
      if (folderMap.has(folderPath)) {
        return folderMap.get(folderPath)!;
      }

      const parts = folderPath.split('/');
      const folderName = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const parentFolder = getOrCreateFolder(parentPath, depth - 1);

      const newFolder: TreeFolderNode = {
        type: 'folder',
        id: `folder:${folderPath}`,
        name: folderName,
        fullPath: folderPath,
        depth,
        folders: [],
        files: [],
        totalFileCount: 0,
      };

      parentFolder.folders.push(newFolder);
      folderMap.set(folderPath, newFolder);
      paths.add(folderPath);
      return newFolder;
    };

    for (const doc of docs) {
      // Clean path separators
      const cleanPath = doc.name.replace(/\\/g, '/');
      const parts = cleanPath.split('/');

      if (parts.length === 1) {
        root.files.push({
          type: 'file',
          id: doc.id,
          name: parts[0],
          fullPath: doc.name,
          depth: 1,
          doc,
        });
      } else {
        const folderPath = parts.slice(0, -1).join('/');
        const fileName = parts[parts.length - 1];
        const folder = getOrCreateFolder(folderPath, parts.length - 1);
        folder.files.push({
          type: 'file',
          id: doc.id,
          name: fileName,
          fullPath: doc.name,
          depth: parts.length,
          doc,
        });
      }
    }

    // Sort folders & files alphabetically and compute total counts recursively
    const computeTotalsAndSort = (node: TreeFolderNode): number => {
      node.folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      node.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      let count = node.files.length;
      for (const sub of node.folders) {
        count += computeTotalsAndSort(sub);
      }
      node.totalFileCount = count;
      return count;
    };

    computeTotalsAndSort(root);

    return { rootFolder: root, allFolderPaths: paths };
  }, [docs, subjectName]);

  const toggleFolder = useCallback((folderPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedFolders(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedFolders(new Set(allFolderPaths));
  }, [allFolderPaths]);

  // Check if a node or its children match search
  const isMatch = useCallback((name: string, query: string) => {
    if (!query) return true;
    return name.toLowerCase().includes(query.toLowerCase());
  }, []);

  // Recursive folder renderer
  const renderFolder = (folder: TreeFolderNode) => {
    const isRoot = folder.id === 'root';
    const isCollapsed = !isRoot && collapsedFolders.has(folder.fullPath);
    const query = searchQuery.trim().toLowerCase();

    // Check if this folder or any nested item matches query
    const hasMatchingDescendant = (node: TreeFolderNode): boolean => {
      if (!query) return true;
      if (node.files.some((f) => f.name.toLowerCase().includes(query))) return true;
      return node.folders.some((sub) => hasMatchingDescendant(sub));
    };

    if (query && !hasMatchingDescendant(folder) && !folder.name.toLowerCase().includes(query)) {
      return null;
    }

    return (
      <div key={folder.id} className="flex flex-col select-none">
        {/* Folder Header Row (Skip root row) */}
        {!isRoot && (
          <div
            onClick={() => toggleFolder(folder.fullPath)}
            style={{ paddingLeft: `${(folder.depth - 1) * (isCompact ? 12 : 16) + 6}px` }}
            className={`group/folder flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
              isCompact
                ? 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-xs'
                : 'hover:bg-surface border border-transparent hover:border-border text-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-zinc-400 group-hover/folder:text-zinc-600 dark:group-hover/folder:text-zinc-200 transition-transform duration-150">
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="text-amber-500 dark:text-amber-400 flex-shrink-0">
                {isCollapsed ? (
                  <Folder className="h-4 w-4" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover/folder:text-accent transition-colors">
                {folder.name}
              </span>
            </div>

            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-200/60 dark:bg-surface px-1.5 py-0.5 rounded-full flex-shrink-0">
              {folder.totalFileCount}
            </span>
          </div>
        )}

        {/* Folder Children (Files & Subfolders) */}
        {(!isCollapsed || isRoot) && (
          <div
            className={`flex flex-col relative ${
              !isRoot ? 'ml-3 border-l border-zinc-200/80 dark:border-zinc-800/80' : ''
            }`}
          >
            {/* Subfolders */}
            {folder.folders.map((sub) => renderFolder(sub))}

            {/* Direct Files in this Folder */}
            {folder.files.map((file) => {
              if (query && !isMatch(file.name, query)) return null;
              const isActive = activeDocId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => onSelectDoc(file.doc)}
                  style={{
                    paddingLeft: `${(file.depth - 1) * (isCompact ? 10 : 14) + (isCompact ? 6 : 8)}px`,
                  }}
                  className={`group/file flex items-center justify-between py-1.5 px-2.5 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'bg-accent/10 border border-accent/30 text-accent font-semibold'
                      : isCompact
                      ? 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                      : 'hover:bg-surface border border-transparent hover:border-border text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(file.name)}
                    <span className="truncate text-xs group-hover/file:text-accent transition-colors">
                      {file.name}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-zinc-400 group-hover/file:opacity-0 sm:group-hover/file:opacity-100 transition-opacity">
                      {file.doc.size}
                    </span>

                    {onRemoveDoc && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveDoc(file.id, e);
                        }}
                        title={`Remove ${file.name}`}
                        className="opacity-0 group-hover/file:opacity-100 p-1 hover:text-rose-500 text-zinc-400 transition-opacity rounded hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}

                    <div className="opacity-0 group-hover/file:opacity-100 flex items-center gap-1 text-[11px] font-medium text-accent">
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Controls Bar: Search & Expand/Collapse */}
      {showControls && (
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2 border-b border-border">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files in folder..."
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-surface border border-border focus:outline-none focus:border-accent text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Expand / Collapse All Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={expandAll}
              title="Expand All Folders"
              className="p-1.5 rounded-md hover:bg-surface text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={collapseAll}
              title="Collapse All Folders"
              className="p-1.5 rounded-md hover:bg-surface text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Folder Hierarchy Tree */}
      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {renderFolder(rootFolder)}
      </div>
    </div>
  );
};

export default FolderTreeExplorer;
