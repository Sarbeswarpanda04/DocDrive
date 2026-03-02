'use client';

import { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderItem {
  id: string;
  folder_name: string;
  parent_folder_id: string | null;
}

interface FolderTreeProps {
  folders: FolderItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

interface TreeNodeProps {
  folder: FolderItem;
  children: FolderItem[];
  allFolders: FolderItem[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

function TreeNode({
  folder, children, allFolders, depth, selectedId, onSelect,
  onCreateFolder, onRenameFolder, onDeleteFolder,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isSelected = selectedId === folder.id;

  const getChildren = (parentId: string) =>
    allFolders.filter((f) => f.parent_folder_id === parentId);

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          isSelected ? 'bg-brand-900/50 text-brand-300' : 'hover:bg-gray-800 text-gray-300'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-300 transition-colors w-4 flex-shrink-0"
        >
          {children.length > 0 ? (
            expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : (
            <span className="w-3" />
          )}
        </button>

        <button
          onClick={() => onSelect(isSelected ? null : folder.id)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {expanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          )}
          <span className="text-sm truncate">{folder.folder_name}</span>
        </button>

        <div className="relative opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onCreateFolder(folder.id); }}
            className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700"
            title="New subfolder"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      </div>

      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              folder={child}
              children={getChildren(child.id)}
              allFolders={allFolders}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders, selectedId, onSelect, onCreateFolder, onRenameFolder, onDeleteFolder,
}: FolderTreeProps) {
  const rootFolders = folders.filter((f) => !f.parent_folder_id);

  const getChildren = (parentId: string) =>
    folders.filter((f) => f.parent_folder_id === parentId);

  return (
    <nav className="space-y-0.5">
      {/* Root / All Files */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
          selectedId === null
            ? 'bg-brand-900/50 text-brand-300'
            : 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
        )}
      >
        <Folder className="w-4 h-4" />
        All Files
      </button>

      {rootFolders.map((folder) => (
        <TreeNode
          key={folder.id}
          folder={folder}
          children={getChildren(folder.id)}
          allFolders={folders}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
        />
      ))}

      <button
        onClick={() => onCreateFolder(null)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Folder
      </button>
    </nav>
  );
}
