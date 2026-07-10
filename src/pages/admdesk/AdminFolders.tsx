// src/pages/admin/AdminFolders.tsx

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
    fetchRHCFolders,
    fetchRHCFolderById,
    fetchRHCFolderCategories,
    fetchRHCFolderChildren,
    fetchRHCFolderDocuments,
    createRHCFolder,
    updateRHCFolder,
    deleteRHCFolder,
    searchRHCFolders,
    selectAllRHCFolders,
    selectRHCFoldersLoading,
    selectRHCFoldersError,
    selectRHCFolderCategories,
    selectRHCFolderSearchResults,
    selectSelectedRHCFolder,
    selectRHCFolderHierarchy,
    selectRHCFolderDocuments,
    clearFolderError,
    clearSearchResults,
    clearSelectedFolder,
    clearHierarchy,
    clearFolderDocuments,
    selectRootFolders,
    selectActiveFolders,
    type RHCFolder,
    type FolderCategory,
    type FolderStatus,
    type FolderDocument,
    CATEGORY_LABELS,
    CATEGORY_COLORS,
    STATUS_LABELS,
    STATUS_COLORS,
} from '../../store/slices/rhcFoldersSlice';
import { Toaster, toast } from 'react-hot-toast';
import {
    Plus,
    Search,
    X,
    Loader2,
    FolderOpen,
    Folder,
    Edit,
    Trash2,
    ChevronRight,
    ChevronDown,
    Check,
    AlertCircle,
    FileText,
    //Eye,
    Grid,
    List,
    ArrowLeft,
    Home,
    File,
    Download,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FolderFormData {
    ref_no: string;
    name: string;
    category: FolderCategory;
    description: string;
    status: FolderStatus;
    parent_folder_id: string;
}

// ─── Folder Card Component ─────────────────────────────────────────────────

const FolderCard: React.FC<{
    folder: RHCFolder;
    onEdit: (folder: RHCFolder) => void;
    onDelete: (id: string) => void;
    onView: (id: string) => void;
    onToggleChildren: (id: string) => void;
    isExpanded: boolean;
    level?: number;
    isClickable?: boolean;
}> = ({ 
    folder, 
    onEdit, 
    onDelete, 
    onView, 
    onToggleChildren, 
    isExpanded, 
    level = 0,
    isClickable = true 
}) => {
    const categoryColor = CATEGORY_COLORS[folder.category] || 'bg-stone-50 text-stone-700';
    const statusColor = STATUS_COLORS[folder.status] || 'bg-stone-50 text-stone-700';
    const hasChildren = (folder.sub_folder_count || 0) > 0;

    const handleClick = () => {
        if (isClickable) {
            onView(folder.id);
        }
    };

    return (
        <div 
            className="group" 
            style={{ paddingLeft: level * 24 }}
            onClick={handleClick}
        >
            <div className={`flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 transition ${
                isClickable ? 'cursor-pointer hover:shadow-md hover:border-stone-300' : ''
            }`}>
                {/* Left Section */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Expand/Collapse */}
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleChildren(folder.id);
                            }}
                            className="p-0.5 rounded hover:bg-stone-100 transition"
                        >
                            {isExpanded ? (
                                <ChevronDown size={16} className="text-stone-400" />
                            ) : (
                                <ChevronRight size={16} className="text-stone-400" />
                            )}
                        </button>
                    )}
                    {!hasChildren && <div className="w-5" />}

                    {/* Icon */}
                    <div className="flex-shrink-0">
                        {folder.status === 'active' ? (
                            <FolderOpen size={18} className="text-[#c9a84c]" />
                        ) : (
                            <Folder size={18} className="text-stone-400" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-stone-400">{folder.ref_no}</span>
                            <span className="font-medium text-stone-800 truncate">{folder.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor}`}>
                                {CATEGORY_LABELS[folder.category]}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
                                {STATUS_LABELS[folder.status]}
                            </span>
                            {folder.document_count !== undefined && folder.document_count > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                                    <FileText size={10} />
                                    {folder.document_count} doc{folder.document_count !== 1 ? 's' : ''}
                                </span>
                            )}
                            {folder.sub_folder_count !== undefined && folder.sub_folder_count > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                                    <Folder size={10} />
                                    {folder.sub_folder_count} sub-folder{folder.sub_folder_count !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onView(folder.id)}
                        className="rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-50 hover:text-amber-800"
                        title="Open Folder"
                    >
                        <FolderOpen size={16} />
                    </button>
                    <button
                        onClick={() => onEdit(folder)}
                        className="rounded-lg p-1.5 text-blue-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title="Edit Folder"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(folder.id)}
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete Folder"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Document Item Component ──────────────────────────────────────────────

const DocumentItem: React.FC<{ document: FolderDocument }> = ({ document }) => {
    return (
        <div className="flex items-center justify-between rounded-lg border border-stone-100 bg-white p-3 transition hover:shadow-sm">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0">
                    <File size={16} className="text-stone-400" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 truncate">{document.subject}</p>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="font-mono">{document.ref}</span>
                        <span className="uppercase">{document.format}</span>
                        <span>{new Date(document.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                <a
                    href={document.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                    title="View Document"
                >
                    <ExternalLink size={16} />
                </a>
                <a
                    href={document.file_url}
                    download
                    className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                    title="Download Document"
                >
                    <Download size={16} />
                </a>
            </div>
        </div>
    );
};

// ─── Folder Detail View ──────────────────────────────────────────────────

const FolderDetailView: React.FC<{
    folder: RHCFolder;
    children: RHCFolder[];
    documents: FolderDocument[];
    loading: boolean;
    onBack: () => void;
    onEdit: (folder: RHCFolder) => void;
    onDelete: (id: string) => void;
    onViewFolder: (id: string) => void;
    onRefresh: () => void;
}> = ({ 
    folder, 
    children, 
    documents, 
    loading, 
    onBack, 
    onEdit, 
    onDelete, 
    onViewFolder,
    onRefresh 
}) => {
    const categoryColor = CATEGORY_COLORS[folder.category] || 'bg-stone-50 text-stone-700';
    const statusColor = STATUS_COLORS[folder.status] || 'bg-stone-50 text-stone-700';

    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <span className="text-stone-300">/</span>
                <Home size={16} className="text-stone-400" />
                <span className="text-stone-300">/</span>
                <span className="text-sm font-medium text-stone-800">{folder.name}</span>
            </div>

            {/* Folder Header */}
            <div className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FolderOpen size={24} className="text-[#c9a84c]" />
                            <h2 className="text-xl font-bold text-stone-800">{folder.name}</h2>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="font-mono text-sm text-stone-400">{folder.ref_no}</span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
                                {CATEGORY_LABELS[folder.category]}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                                {STATUS_LABELS[folder.status]}
                            </span>
                        </div>
                        {folder.description && (
                            <p className="mt-2 text-sm text-stone-600">{folder.description}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(folder)}
                            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
                        >
                            <Edit size={16} className="inline mr-1" />
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(folder.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition"
                        >
                            <Trash2 size={16} className="inline mr-1" />
                            Delete
                        </button>
                        <button
                            onClick={onRefresh}
                            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
                        >
                            <RefreshCw size={16} className="inline mr-1" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-[#c9a84c]" />
                    <span className="ml-3 text-sm text-stone-600">Loading contents...</span>
                </div>
            ) : (
                <>
                    {/* Sub-folders */}
                    <div>
                        <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                            <Folder size={16} />
                            Sub-folders ({children.length})
                        </h3>
                        {children.length === 0 ? (
                            <p className="text-sm text-stone-400 italic">No sub-folders</p>
                        ) : (
                            <div className="space-y-2">
                                {children.map(child => (
                                    <FolderCard
                                        key={child.id}
                                        folder={child}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onView={onViewFolder}
                                        onToggleChildren={() => {}}
                                        isExpanded={false}
                                        level={0}
                                        isClickable={true}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Documents */}
                    <div>
                        <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                            <FileText size={16} />
                            Documents ({documents.length})
                        </h3>
                        {documents.length === 0 ? (
                            <p className="text-sm text-stone-400 italic">No documents</p>
                        ) : (
                            <div className="space-y-2">
                                {documents.map(doc => (
                                    <DocumentItem key={doc.id} document={doc} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const AdminFolders: React.FC = () => {
    const dispatch = useAppDispatch();

    // Redux state
    const folders = useAppSelector(selectAllRHCFolders);
    const rootFolders = useAppSelector(selectRootFolders);
    const activeFolders = useAppSelector(selectActiveFolders);
    const categories = useAppSelector(selectRHCFolderCategories);
    const searchResults = useAppSelector(selectRHCFolderSearchResults);
    const selectedFolder = useAppSelector(selectSelectedRHCFolder);
    const hierarchy = useAppSelector(selectRHCFolderHierarchy);
    const folderDocuments = useAppSelector(selectRHCFolderDocuments);
    const loading = useAppSelector(selectRHCFoldersLoading);
    const error = useAppSelector(selectRHCFoldersError);

    // Local state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<FolderCategory | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<FolderStatus | 'all'>('all');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedFolderForEdit, setSelectedFolderForEdit] = useState<RHCFolder | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isDetailView, setIsDetailView] = useState(false);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FolderFormData>({
        ref_no: '',
        name: '',
        category: 'court',
        description: '',
        status: 'active',
        parent_folder_id: '',
    });

    // ── Fetch Data ──────────────────────────────────────────────────────────

    useEffect(() => {
        dispatch(fetchRHCFolders({ include_sub_folders: true }));
        dispatch(fetchRHCFolderCategories());
    }, [dispatch]);

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleToggleExpand = (folderId: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length >= 2) {
            dispatch(searchRHCFolders(query));
        } else {
            dispatch(clearSearchResults());
        }
    };

    const handleFilterChange = (
        category: FolderCategory | 'all',
        status: FolderStatus | 'all'
    ) => {
        setSelectedCategory(category);
        setSelectedStatus(status);
        dispatch(fetchRHCFolders({
            category: category === 'all' ? undefined : category,
            status: status === 'all' ? undefined : status,
            include_sub_folders: true,
        }));
    };

    const handleViewFolder = async (id: string) => {
        setCurrentFolderId(id);
        setIsDetailView(true);
        await dispatch(fetchRHCFolderById(id));
        await dispatch(fetchRHCFolderChildren({ id }));
        await dispatch(fetchRHCFolderDocuments({ id }));
    };

    const handleBackToList = () => {
        setIsDetailView(false);
        setCurrentFolderId(null);
        dispatch(clearSelectedFolder());
        dispatch(clearHierarchy());
        dispatch(clearFolderDocuments());
        dispatch(fetchRHCFolders({ include_sub_folders: true }));
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await dispatch(createRHCFolder({
                ref_no: formData.ref_no,
                name: formData.name,
                category: formData.category,
                description: formData.description || undefined,
                parent_folder_id: currentFolderId || formData.parent_folder_id || undefined,
                status: formData.status,
            })).unwrap();
            toast.success('Folder created successfully!');
            setShowCreateModal(false);
            resetForm();
            if (isDetailView && currentFolderId) {
                await handleViewFolder(currentFolderId);
            }
            dispatch(fetchRHCFolders({ include_sub_folders: true }));
            dispatch(fetchRHCFolderCategories());
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Failed to create folder');
        }
    };

    const handleUpdateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFolderForEdit) return;
        try {
            await dispatch(updateRHCFolder({
                id: selectedFolderForEdit.id,
                input: {
                    name: formData.name,
                    description: formData.description || undefined,
                    status: formData.status,
                },
            })).unwrap();
            toast.success('Folder updated successfully!');
            setShowEditModal(false);
            setSelectedFolderForEdit(null);
            resetForm();
            if (isDetailView && currentFolderId) {
                await handleViewFolder(currentFolderId);
            }
            dispatch(fetchRHCFolders({ include_sub_folders: true }));
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Failed to update folder');
        }
    };

    const handleDeleteFolder = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
            return;
        }
        try {
            await dispatch(deleteRHCFolder(id)).unwrap();
            toast.success('Folder deleted successfully!');
            if (isDetailView && currentFolderId === id) {
                handleBackToList();
            }
            dispatch(fetchRHCFolders({ include_sub_folders: true }));
            dispatch(fetchRHCFolderCategories());
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Failed to delete folder');
        }
    };

    const handleEditClick = (folder: RHCFolder) => {
        setSelectedFolderForEdit(folder);
        setFormData({
            ref_no: folder.ref_no,
            name: folder.name,
            category: folder.category,
            description: folder.description || '',
            status: folder.status,
            parent_folder_id: folder.parent_folder_id || '',
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            ref_no: '',
            name: '',
            category: 'court',
            description: '',
            status: 'active',
            parent_folder_id: '',
        });
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ── Render Helpers ──────────────────────────────────────────────────────

    const renderFolders = (folderList: RHCFolder[], level: number = 0) => {
        return folderList.map(folder => (
            <React.Fragment key={folder.id}>
                <FolderCard
                    folder={folder}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteFolder}
                    onView={handleViewFolder}
                    onToggleChildren={handleToggleExpand}
                    isExpanded={expandedFolders.has(folder.id)}
                    level={level}
                    isClickable={true}
                />
                {expandedFolders.has(folder.id) && folder.sub_folder_count && folder.sub_folder_count > 0 && (
                    <div className="ml-4 border-l-2 border-stone-100 pl-2">
                        <p className="text-xs text-stone-400 py-2 pl-8">Loading children...</p>
                    </div>
                )}
            </React.Fragment>
        ));
    };

    const renderCategoryStats = () => {
        if (categories.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(({ category, count }) => (
                    <button
                        key={category}
                        onClick={() => handleFilterChange(category, selectedStatus)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                            selectedCategory === category
                                ? `${CATEGORY_COLORS[category]} ring-2 ring-[#c9a84c]`
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        {CATEGORY_LABELS[category]}
                        <span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px]">
                            {count}
                        </span>
                    </button>
                ))}
                {selectedCategory !== 'all' && (
                    <button
                        onClick={() => handleFilterChange('all', selectedStatus)}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200"
                    >
                        <X size={12} />
                        Clear Filter
                    </button>
                )}
            </div>
        );
    };

    const displayFolders = searchQuery.length >= 2 ? searchResults : rootFolders;

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-stone-50 p-6">
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        borderRadius: '10px',
                        fontSize: '13px',
                        background: '#fff',
                        color: '#1c1917',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    },
                    success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
                }}
            />

            {isDetailView && selectedFolder ? (
                // ── Detail View ──────────────────────────────────────────
                <FolderDetailView
                    folder={selectedFolder}
                    children={hierarchy?.children || []}
                    documents={folderDocuments}
                    loading={loading.fetch || loading.fetchOne}
                    onBack={handleBackToList}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteFolder}
                    onViewFolder={handleViewFolder}
                    onRefresh={() => currentFolderId && handleViewFolder(currentFolderId)}
                />
            ) : (
                // ── List View ────────────────────────────────────────────
                <>
                    {/* ── Header ────────────────────────────────────────── */}
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-[#1a3d1c] flex items-center gap-2">
                                <FolderOpen size={28} className="text-[#c9a84c]" />
                                RHC Folders
                            </h1>
                            <p className="mt-1 text-sm text-stone-500">
                                {activeFolders.length} active folders · {folders.length} total
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
                        >
                            <Plus size={18} />
                            New Folder
                        </button>
                    </div>

                    {/* ── Category Stats ────────────────────────────────── */}
                    {renderCategoryStats()}

                    {/* ── Search & Filters ──────────────────────────────── */}
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search folders by reference or name..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full rounded-lg border border-stone-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        dispatch(clearSearchResults());
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={selectedStatus}
                                onChange={(e) => handleFilterChange(
                                    selectedCategory,
                                    e.target.value as FolderStatus | 'all'
                                )}
                                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                            >
                                <option value="all">All Status</option>
                                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>

                            {/* View Mode Toggle */}
                            <div className="flex rounded-lg border border-stone-200 bg-white overflow-hidden">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-2 transition ${
                                        viewMode === 'list'
                                            ? 'bg-[#c9a84c] text-[#1a3d1c]'
                                            : 'text-stone-500 hover:bg-stone-50'
                                    }`}
                                    title="List View"
                                >
                                    <List size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-2 transition ${
                                        viewMode === 'grid'
                                            ? 'bg-[#c9a84c] text-[#1a3d1c]'
                                            : 'text-stone-500 hover:bg-stone-50'
                                    }`}
                                    title="Grid View"
                                >
                                    <Grid size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Folder List ──────────────────────────────────────── */}
                    {loading.fetch ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-[#c9a84c]" />
                            <span className="ml-3 text-sm text-stone-600">Loading folders...</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={18} className="text-red-600" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                                <button
                                    onClick={() => dispatch(clearFolderError())}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ) : displayFolders.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-stone-200 bg-white p-12 text-center">
                            <Folder size={48} className="mx-auto text-stone-300" />
                            <p className="mt-3 text-sm text-stone-500">No folders found</p>
                            <p className="text-xs text-stone-400">
                                {searchQuery ? 'Try adjusting your search or filters' : 'Create your first folder using the button above'}
                            </p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayFolders.map(folder => (
                                <div
                                    key={folder.id}
                                    onClick={() => handleViewFolder(folder.id)}
                                    className="rounded-lg border border-stone-200 bg-white p-4 transition hover:shadow-md hover:border-stone-300 cursor-pointer"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            {folder.status === 'active' ? (
                                                <FolderOpen size={20} className="text-[#c9a84c]" />
                                            ) : (
                                                <Folder size={20} className="text-stone-400" />
                                            )}
                                            <div>
                                                <p className="font-mono text-xs text-stone-400">{folder.ref_no}</p>
                                                <p className="font-medium text-stone-800">{folder.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleEditClick(folder)}
                                                className="p-1 text-blue-400 hover:text-blue-600"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFolder(folder.id)}
                                                className="p-1 text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[folder.category]}`}>
                                            {CATEGORY_LABELS[folder.category]}
                                        </span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[folder.status]}`}>
                                            {STATUS_LABELS[folder.status]}
                                        </span>
                                    </div>
                                    {folder.description && (
                                        <p className="mt-2 text-xs text-stone-500 line-clamp-2">{folder.description}</p>
                                    )}
                                    <div className="mt-3 flex gap-3 text-xs text-stone-400">
                                        {folder.document_count !== undefined && folder.document_count > 0 && (
                                            <span className="inline-flex items-center gap-1">
                                                <FileText size={12} />
                                                {folder.document_count}
                                            </span>
                                        )}
                                        {folder.sub_folder_count !== undefined && folder.sub_folder_count > 0 && (
                                            <span className="inline-flex items-center gap-1">
                                                <Folder size={12} />
                                                {folder.sub_folder_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {renderFolders(displayFolders)}
                        </div>
                    )}
                </>
            )}

            {/* ── Create Modal ────────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-[#1a3d1c]">Create New Folder</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-stone-400 hover:text-stone-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
                            {currentFolderId && (
                                <div className="rounded-md bg-blue-50 p-3">
                                    <p className="text-xs text-blue-700">
                                        Creating sub-folder inside: <span className="font-semibold">{selectedFolder?.name}</span>
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Reference Number *
                                </label>
                                <input
                                    type="text"
                                    name="ref_no"
                                    value={formData.ref_no}
                                    onChange={handleInputChange}
                                    placeholder="e.g. RHC/NEW/001"
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Folder Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. New Folder Name"
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                                    required
                                >
                                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    placeholder="Folder description..."
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] resize-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                                >
                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading.create}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50"
                                >
                                    {loading.create ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Plus size={16} />
                                    )}
                                    Create Folder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────────────────────── */}
            {showEditModal && selectedFolderForEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-[#1a3d1c]">Edit Folder</h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedFolderForEdit(null);
                                    resetForm();
                                }}
                                className="text-stone-400 hover:text-stone-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateFolder} className="p-6 space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Reference Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.ref_no}
                                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500"
                                    disabled
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Folder Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Category
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500"
                                    disabled
                                >
                                    <option value={formData.category}>
                                        {CATEGORY_LABELS[formData.category]}
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    placeholder="Folder description..."
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] resize-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-stone-700">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                                >
                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedFolderForEdit(null);
                                        resetForm();
                                    }}
                                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading.update}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50"
                                >
                                    {loading.update ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Check size={16} />
                                    )}
                                    Update Folder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFolders;