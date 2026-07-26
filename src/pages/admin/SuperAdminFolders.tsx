// src/pages/admin/SuperAdminFolders.tsx
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
import { toast } from 'react-hot-toast';
import {
    Plus,
    Search,
    X,
    Loader2,
    FolderOpen,
    Folder,
    Edit,
    Trash2,
    ArrowLeft,
    Home,
    FileText,
    RefreshCw,
    Download,
    ExternalLink,
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

// ─── Folder Card Component (Simplified like Registry station cards) ─────

const FolderCard: React.FC<{
    folder: RHCFolder;
    onEdit: (folder: RHCFolder) => void;
    onDelete: (id: string) => void;
    onView: (id: string) => void;
}> = ({ folder, onEdit, onDelete, onView }) => {
    const categoryColor = CATEGORY_COLORS[folder.category] || 'bg-slate-50 text-slate-700';

    return (
        <div
            onClick={() => onView(folder.id)}
            className="relative flex flex-col items-center py-6 px-4 text-center bg-white transition cursor-pointer hover:shadow-md hover:border-slate-300 border border-slate-200 rounded-xl"
        >
            {/* Icon */}
            <span className="text-3xl mb-2">
                {folder.status === 'active' ? '📁' : '📂'}
            </span>
            
            {/* Reference Number */}
            <span className="text-xs font-mono font-medium text-[#8B6914]">{folder.ref_no}</span>
            
            {/* Name */}
            <span className="text-sm font-medium text-slate-800">{folder.name}</span>
            
            {/* Type Badge */}
            <span className={`text-[11px] text-slate-400 mb-3 inline-flex items-center rounded-full px-2 py-0.5 ${categoryColor}`}>
                {CATEGORY_LABELS[folder.category]}
            </span>
            
            {/* Document Count */}
            <span className="text-xl font-medium text-slate-800">{folder.document_count || 0}</span>
            <span className="text-[11px] text-slate-400">documents on record</span>
            
            <span className="text-[10px] text-amber-600 mt-2">Click to view files</span>

            {/* Action Buttons (hidden on hover like Registry) */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
                    className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                    title="Edit"
                >
                    <Edit size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

// ─── Document Card Component (Like Registry station cards) ──────────────

const DocumentCard: React.FC<{ document: FolderDocument }> = ({ document }) => {
    return (
        <div className="relative flex flex-col items-center py-6 px-4 text-center bg-white transition hover:shadow-md border border-slate-200 rounded-xl">
            {/* Icon */}
            <span className="text-3xl mb-2">📄</span>
            
            {/* Document Reference */}
            <span className="text-xs font-mono font-medium text-[#8B6914]">{document.ref || 'No ref'}</span>
            
            {/* Document Title */}
            <span className="text-sm font-medium text-slate-800 truncate w-full">{document.subject}</span>
            
            {/* Format */}
            <span className="text-[11px] text-slate-400 mb-3 uppercase">{document.format || 'Document'}</span>
            
            {/* Date */}
            <span className="text-xs text-slate-400">{new Date(document.created_at).toLocaleDateString()}</span>

            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1">
                {document.file_url && (
                    <>
                        <a
                            href={document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                            title="View"
                        >
                            <ExternalLink size={14} />
                        </a>
                        <a
                            href={document.file_url}
                            download
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition"
                            title="Download"
                        >
                            <Download size={14} />
                        </a>
                    </>
                )}
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
    const categoryColor = CATEGORY_COLORS[folder.category] || 'bg-slate-50 text-slate-700';
    const statusColor = STATUS_COLORS[folder.status] || 'bg-slate-50 text-slate-700';

    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <span className="text-slate-300">/</span>
                <Home size={16} className="text-slate-400" />
                <span className="text-slate-300">/</span>
                <span className="text-sm font-medium text-slate-800">{folder.name}</span>
            </div>

            {/* Folder Header */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FolderOpen size={24} className="text-[#8B6914]" />
                            <h2 className="text-xl font-bold text-slate-800">{folder.name}</h2>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="font-mono text-sm text-slate-400">{folder.ref_no}</span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
                                {CATEGORY_LABELS[folder.category]}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                                {STATUS_LABELS[folder.status]}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <FileText size={14} />
                                {folder.document_count || 0} documents
                            </span>
                        </div>
                        {folder.description && (
                            <p className="mt-2 text-sm text-slate-600">{folder.description}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(folder)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
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
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
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
                    <Loader2 size={32} className="animate-spin text-[#8B6914]" />
                    <span className="ml-3 text-sm text-slate-600">Loading contents...</span>
                </div>
            ) : (
                <>
                    {/* Sub-folders grid */}
                    {children.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-slate-700 mb-3">Sub-folders</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                                {children.map(child => (
                                    <div
                                        key={child.id}
                                        onClick={() => onViewFolder(child.id)}
                                        className="relative flex flex-col items-center py-6 px-4 text-center bg-white transition cursor-pointer hover:shadow-md"
                                    >
                                        <span className="text-3xl mb-2">📁</span>
                                        <span className="text-xs font-mono font-medium text-[#8B6914]">{child.ref_no}</span>
                                        <span className="text-sm font-medium text-slate-800">{child.name}</span>
                                        <span className="text-[11px] text-slate-400">{child.document_count || 0} documents</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents grid - Same layout as Registry stations */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                            <FileText size={16} />
                            Documents ({documents.length})
                        </h3>
                        {documents.length === 0 ? (
                            <div className="py-16 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                                <p>No documents in this folder</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                                {documents.map(doc => (
                                    <DocumentCard key={doc.id} document={doc} />
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

const SuperAdminFolders: React.FC = () => {
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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedFolderForEdit, setSelectedFolderForEdit] = useState<RHCFolder | null>(null);
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

    // ── Render Category Filters (like Registry tabs) ──────────────────────

    const renderCategoryFilters = () => {
        if (categories.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(({ category, count }) => (
                    <button
                        key={category}
                        onClick={() => handleFilterChange(category, selectedStatus)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                            selectedCategory === category
                                ? `${CATEGORY_COLORS[category]} ring-2 ring-[#8B6914]`
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {CATEGORY_LABELS[category]}
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px]">
                            {count}
                        </span>
                    </button>
                ))}
                {selectedCategory !== 'all' && (
                    <button
                        onClick={() => handleFilterChange('all', selectedStatus)}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
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
        <>
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
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <FolderOpen size={28} className="text-[#8B6914]" />
                                RHC Folders
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {activeFolders.length} active folders · {folders.length} total
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A5E12]"
                        >
                            <Plus size={18} />
                            New Folder
                        </button>
                    </div>

                    {/* ── Category Filters ──────────────────────────────── */}
                    {renderCategoryFilters()}

                    {/* ── Search ──────────────────────────────────────────── */}
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search folders by reference or name..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        dispatch(clearSearchResults());
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Folder Grid (like Registry station grid) ────── */}
                    {loading.fetch ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-[#8B6914]" />
                            <span className="ml-3 text-sm text-slate-600">Loading folders...</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-600">⚠️</span>
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
                        <div className="py-16 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <Folder size={48} className="mx-auto text-slate-300 mb-3" />
                            <p>No folders found</p>
                            <p className="text-xs mt-1">
                                {searchQuery ? 'Try adjusting your search' : 'Create your first folder using the button above'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                            {displayFolders.map(folder => (
                                <FolderCard
                                    key={folder.id}
                                    folder={folder}
                                    onEdit={handleEditClick}
                                    onDelete={handleDeleteFolder}
                                    onView={handleViewFolder}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Create Modal ────────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-900">Create New Folder</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-400 hover:text-slate-600"
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
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Reference Number *
                                </label>
                                <input
                                    type="text"
                                    name="ref_no"
                                    value={formData.ref_no}
                                    onChange={handleInputChange}
                                    placeholder="e.g. RHC/NEW/001"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Folder Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. New Folder Name"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                                    required
                                >
                                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    placeholder="Folder description..."
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914] resize-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
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
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading.create}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A5E12] disabled:opacity-50"
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
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-900">Edit Folder</h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedFolderForEdit(null);
                                    resetForm();
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateFolder} className="p-6 space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Reference Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.ref_no}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                                    disabled
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Folder Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Category
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                                    disabled
                                >
                                    <option value={formData.category}>
                                        {CATEGORY_LABELS[formData.category]}
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    placeholder="Folder description..."
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914] resize-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
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
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading.update}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A5E12] disabled:opacity-50"
                                >
                                    {loading.update ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <span>Update Folder</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default SuperAdminFolders;