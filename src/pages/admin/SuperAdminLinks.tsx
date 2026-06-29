// src/components/super-admin/SuperAdminLinks.tsx
import React, { useState, useEffect, useMemo, useCallback, createElement } from 'react';
import {
  BarChart3, BookOpen, Building2, Calendar, Crown, ExternalLink,
  FileText, FolderOpen, GitBranch, Globe, Globe2, HelpCircle,
  List, Mail, MessageSquare, Package, RefreshCw, Search,
  Sparkles, Star, Users, Video, Zap, Loader2, Plus, Pencil,
  Trash2, X, FolderPlus, Settings2, AlertTriangle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchLinks,
  fetchCategories,
  fetchLinkStats,
  trackLinkClick,
  createLink,
  updateLink,
  deleteLink,
  createCategory,
  updateCategory,
  deleteCategory,
  selectAllLinks,
  selectAllCategories,
  selectLinkStats,
  selectLinksLoading,
  selectStatsLoading,
  selectMutatingLinks,
  selectLinkError,
  setLinkFilters,
  clearLinkError,
  type ExternalLink as ExternalLinkType,
  type ExternalLinkCategory,
  type CreateLinkInput,
  type UpdateLinkInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '../../store/slices/linksSlice';

// ─── Icon Mapper ──────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3, BookOpen, Building2, Calendar, ExternalLink, FileText,
  FolderOpen, GitBranch, Globe, Globe2, HelpCircle, List, Mail,
  MessageSquare, Package, RefreshCw, Search, Sparkles, Star, Users,
  Video, Zap,
};
const ICON_NAMES = Object.keys(iconMap);

const getIcon = (iconName: string | null) => {
  if (!iconName) return ExternalLink;
  return iconMap[iconName] || ExternalLink;
};

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'orange', 'teal', 'yellow', 'red'] as const;

// ─── Component ────────────────────────────────────────────────────────────────

const SuperAdminLinks = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const links = useAppSelector(selectAllLinks);
  const categories = useAppSelector(selectAllCategories);
  const stats = useAppSelector(selectLinkStats);
  const loadingLinks = useAppSelector(selectLinksLoading);
  const loadingStats = useAppSelector(selectStatsLoading);
  const mutating = useAppSelector(selectMutatingLinks);
  const error = useAppSelector(selectLinkError);

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal state
  const [linkModal, setLinkModal] = useState<{ mode: 'create' | 'edit'; link?: ExternalLinkType } | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ mode: 'create' | 'edit'; category?: ExternalLinkCategory } | null>(null);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<
    { type: 'link'; item: ExternalLinkType } | { type: 'category'; item: ExternalLinkCategory } | null
  >(null);

  // Memoized fetch — stable identity for dependency arrays, declared before use
  const fetchData = useCallback(async () => {
    await Promise.all([
      dispatch(fetchLinks({ is_active: true, limit: 100 })),
      dispatch(fetchCategories({ include_inactive: false, include_counts: true })),
      dispatch(fetchLinkStats()),
    ]);
  }, [dispatch]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle search (debounced)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      dispatch(setLinkFilters({ search: searchTerm || undefined }));
      dispatch(fetchLinks({ is_active: true, search: searchTerm || undefined, limit: 100 }));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, dispatch]);

  // Handle category filter
  useEffect(() => {
    if (selectedCategory === 'all') {
      dispatch(setLinkFilters({ category_id: undefined }));
      dispatch(fetchLinks({ is_active: true, search: searchTerm || undefined, limit: 100 }));
    } else {
      dispatch(setLinkFilters({ category_id: selectedCategory }));
      dispatch(fetchLinks({ is_active: true, category_id: selectedCategory, search: searchTerm || undefined, limit: 100 }));
    }
    // searchTerm intentionally omitted: the debounced search effect above
    // already re-fetches on searchTerm changes. Including it here would
    // double-fire a fetch on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, dispatch]);

  // Handle link click
  const handleOpenLink = async (link: ExternalLinkType) => {
    await dispatch(trackLinkClick(link.id));
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  // ─── Mutations ──────────────────────────────────────────────────────────

  const handleSaveLink = async (input: CreateLinkInput | UpdateLinkInput) => {
    if (linkModal?.mode === 'edit' && linkModal.link) {
      const result = await dispatch(updateLink({ id: linkModal.link.id, input: input as UpdateLinkInput }));
      if (!('error' in result)) {
        setLinkModal(null);
        fetchData();
      }
    } else {
      const result = await dispatch(createLink(input as CreateLinkInput));
      if (!('error' in result)) {
        setLinkModal(null);
        fetchData();
      }
    }
  };

  const handleSaveCategory = async (input: CreateCategoryInput | UpdateCategoryInput) => {
    if (categoryModal?.mode === 'edit' && categoryModal.category) {
      const result = await dispatch(updateCategory({ id: categoryModal.category.id, input: input as UpdateCategoryInput }));
      if (!('error' in result)) {
        setCategoryModal(null);
        fetchData();
      }
    } else {
      const result = await dispatch(createCategory(input as CreateCategoryInput));
      if (!('error' in result)) {
        setCategoryModal(null);
        fetchData();
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'link') {
      await dispatch(deleteLink(confirmDelete.item.id));
    } else {
      await dispatch(deleteCategory(confirmDelete.item.id));
    }
    setConfirmDelete(null);
    fetchData();
  };

  // Group links by category
  const groupedLinks = useMemo(() => {
    const grouped: Record<string, { category?: ExternalLinkCategory; links: ExternalLinkType[] }> = {};

    categories.forEach((cat) => {
      const catLinks = links.filter((l) => l.category_id === cat.id && l.is_active);
      if (catLinks.length > 0) {
        const key = `${cat.emoji || '📌'} ${cat.name}`;
        grouped[key] = { category: cat, links: catLinks };
      }
    });

    const uncategorized = links.filter(
      (l) => l.is_active && !categories.some((c) => c.id === l.category_id)
    );
    if (uncategorized.length > 0) {
      grouped['📌 Uncategorized'] = { links: uncategorized };
    }

    return grouped;
  }, [links, categories]);

  // Loading state
  if (loadingLinks && links.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ─── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Super Admin Links
                </h1>
                <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2">
                  <Globe2 className="h-4 w-4" />
                  Curated collection of important external links & resources
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setManageCategoriesOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Settings2 className="h-4 w-4" />
              Categories
            </button>
            <button
              onClick={() => fetchData()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              disabled={loadingLinks}
            >
              {loadingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <button
              onClick={() => setLinkModal({ mode: 'create' })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              Add Link
            </button>
          </div>
        </div>

        {/* ─── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
            <button onClick={() => dispatch(clearLinkError())} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ─── Quick Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickStat icon={LinkIcon} label="Total Links" value={stats?.total_links || links.length} change="All systems" color="blue" loading={loadingStats} />
          <QuickStat icon={Globe} label="Categories" value={stats?.total_categories || categories.length} change="Organized" color="purple" loading={loadingStats} />
          <QuickStat icon={Star} label="Featured Links" value={stats?.featured_links || 0} change="Top picks" color="yellow" loading={loadingStats} />
          <QuickStat icon={BarChart3} label="Total Clicks" value={stats?.total_clicks || 0} change="Tracked" color="green" loading={loadingStats} />
        </div>

        {/* ─── Search & Filter Bar ──────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-gray-700 min-w-[160px]"
            >
              <option value="all">All Categories</option>
              {categories.filter((c) => c.is_active).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
              ))}
            </select>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ─── Link Categories ────────────────────────────────────────────── */}
        {Object.keys(groupedLinks).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No links found</h3>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters, or add a new link</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLinks).map(([title, group]) => (
              <CategorySection
                key={title}
                title={title}
                links={group.links}
                onOpenLink={handleOpenLink}
                onEditLink={(link) => setLinkModal({ mode: 'edit', link })}
                onDeleteLink={(link) => setConfirmDelete({ type: 'link', item: link })}
              />
            ))}
          </div>
        )}

        {/* ─── Quick Actions Bar ───────────────────────────────────────────── */}
        {links.filter((l) => l.is_featured && l.is_active).length > 0 && (
          <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Featured Links
            </h3>
            <div className="flex flex-wrap gap-3">
              {links.filter((l) => l.is_featured && l.is_active).slice(0, 8).map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleOpenLink(link)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                >
                  <IconPreview iconName={link.icon_name ?? 'ExternalLink'} className="h-4 w-4" />
                  {link.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Footer ───────────────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-400 border-t border-gray-200 pt-6 gap-2">
          <div>
            <span className="font-medium text-gray-500">Super Admin Links v2.1</span>
            <span className="mx-2">•</span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
              {error ? 'Error connecting' : 'All systems operational'}
            </span>
            <button onClick={() => window.location.reload()} className="hover:text-gray-600 transition-colors">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Link Create/Edit Modal ──────────────────────────────────────── */}
      {linkModal && (
        <LinkFormModal
          mode={linkModal.mode}
          link={linkModal.link}
          categories={categories}
          saving={mutating}
          onSave={handleSaveLink}
          onClose={() => setLinkModal(null)}
        />
      )}

      {/* ─── Category Create/Edit Modal ──────────────────────────────────── */}
      {categoryModal && (
        <CategoryFormModal
          mode={categoryModal.mode}
          category={categoryModal.category}
          saving={mutating}
          onSave={handleSaveCategory}
          onClose={() => setCategoryModal(null)}
        />
      )}

      {/* ─── Manage Categories Modal ─────────────────────────────────────── */}
      {manageCategoriesOpen && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setManageCategoriesOpen(false)}
          onCreate={() => setCategoryModal({ mode: 'create' })}
          onEdit={(category) => setCategoryModal({ mode: 'edit', category })}
          onDelete={(category) => setConfirmDelete({ type: 'category', item: category })}
        />
      )}

      {/* ─── Delete Confirmation Modal ────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmDeleteModal
          label={confirmDelete.type === 'link' ? confirmDelete.item.name : confirmDelete.item.name}
          description={
            confirmDelete.type === 'category'
              ? 'Deleting this category will also remove all links inside it. This cannot be undone.'
              : 'This link will be permanently removed. This cannot be undone.'
          }
          saving={mutating}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

interface QuickStatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  change: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'teal' | 'yellow' | 'red';
  loading?: boolean;
}

const QuickStat = ({ icon: Icon, label, value, change, color, loading }: QuickStatProps) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-green-600">{change}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 mt-2">
        {loading ? <Loader2 className="h-5 w-5 animate-spin inline" /> : value}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
};

interface CategorySectionProps {
  title: string;
  links: ExternalLinkType[];
  onOpenLink: (link: ExternalLinkType) => void;
  onEditLink: (link: ExternalLinkType) => void;
  onDeleteLink: (link: ExternalLinkType) => void;
}

const CategorySection = ({ title, links, onOpenLink, onEditLink, onDeleteLink }: CategorySectionProps) => {
  const [emoji, ...titleParts] = title.split(' ');
  const cleanTitle = titleParts.join(' ');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          {cleanTitle}
          <span className="ml-auto text-xs text-gray-400 font-normal bg-gray-100 px-2 py-0.5 rounded-full">
            {links.length} links
          </span>
        </h2>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((link) => (
          <div
            key={link.id}
            className="group relative flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
          >
            <button
              onClick={() => onOpenLink(link)}
              className="flex items-start gap-3 text-left flex-1 min-w-0"
            >
              <div className={`p-2 rounded-lg bg-${link.color || 'blue'}-50 text-${link.color || 'blue'}-600 flex-shrink-0 mt-0.5`}>
                <IconPreview iconName={link.icon_name ?? 'ExternalLink'} className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                    {link.name}
                  </p>
                  <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                </div>
                {link.description && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{link.description}</p>
                )}
                {link.tags && link.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {link.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                    ))}
                    {link.tags.length > 2 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{link.tags.length - 2}</span>
                    )}
                  </div>
                )}
                {link.click_count > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">👆 {link.click_count} clicks</p>
                )}
              </div>
            </button>

            {/* Edit / Delete actions, shown on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onEditLink(link)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
                title="Edit link"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDeleteLink(link)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                title="Delete link"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Modal Shell ──────────────────────────────────────────────────────────────

interface ModalShellProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

const ModalShell = ({ title, icon: Icon, onClose, children, maxWidth = 'max-w-lg' }: ModalShellProps) => (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    onClick={onClose}
  >
    <div
      className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Icon className="h-5 w-5 text-blue-600" />
          {title}
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ─── Link Form Modal ──────────────────────────────────────────────────────────

interface LinkFormModalProps {
  mode: 'create' | 'edit';
  link?: ExternalLinkType;
  categories: ExternalLinkCategory[];
  saving: boolean;
  onSave: (input: CreateLinkInput | UpdateLinkInput) => void;
  onClose: () => void;
}

const LinkFormModal = ({ mode, link, categories, saving, onSave, onClose }: LinkFormModalProps) => {
  const [form, setForm] = useState({
    category_id: link?.category_id ?? categories[0]?.id ?? '',
    name: link?.name ?? '',
    description: link?.description ?? '',
    url: link?.url ?? '',
    icon_name: link?.icon_name ?? 'ExternalLink',
    color: link?.color ?? 'blue',
    tags: link?.tags?.join(', ') ?? '',
    is_featured: link?.is_featured ?? false,
    is_active: link?.is_active ?? true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setFormError('Name is required.');
    if (!form.url.trim()) return setFormError('URL is required.');
    if (!form.category_id) return setFormError('Select a category.');
    try {
     
      new URL(form.url);
    } catch {
      return setFormError('Enter a valid URL, including https://');
    }
    setFormError(null);

    onSave({
      category_id: form.category_id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      url: form.url.trim(),
      icon_name: form.icon_name,
      color: form.color,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_featured: form.is_featured,
      is_active: form.is_active,
    });
  };

  return (
    <ModalShell title={mode === 'create' ? 'Add Link' : 'Edit Link'} icon={mode === 'create' ? Plus : Pencil} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {formError}
          </div>
        )}

        <Field label="Name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Staff Directory"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </Field>

        <Field label="URL">
          <input
            type="text"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short description shown under the link"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
          />
        </Field>

        <Field label="Category">
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Icon">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg bg-${form.color}-50 text-${form.color}-600 flex-shrink-0`}>
                <IconPreview iconName={form.icon_name} className="h-4 w-4" />
              </div>
              <select
                value={form.icon_name}
                onChange={(e) => setForm({ ...form, icon_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </Field>

          <Field label="Color">
            <select
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Tags (comma separated)">
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="e.g. hr, internal, forms"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </Field>

        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Active
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create link' : 'Save changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ─── Category Form Modal ──────────────────────────────────────────────────────

interface CategoryFormModalProps {
  mode: 'create' | 'edit';
  category?: ExternalLinkCategory;
  saving: boolean;
  onSave: (input: CreateCategoryInput | UpdateCategoryInput) => void;
  onClose: () => void;
}

const CategoryFormModal = ({ mode, category, saving, onSave, onClose }: CategoryFormModalProps) => {
  const [form, setForm] = useState({
    name: category?.name ?? '',
    emoji: category?.emoji ?? '📌',
    description: category?.description ?? '',
    is_active: category?.is_active ?? true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setFormError('Name is required.');
    setFormError(null);

    onSave({
      name: form.name.trim(),
      emoji: form.emoji.trim() || undefined,
      description: form.description.trim() || undefined,
      is_active: form.is_active,
    });
  };

  return (
    <ModalShell title={mode === 'create' ? 'Add Category' : 'Edit Category'} icon={mode === 'create' ? FolderPlus : Pencil} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {formError}
          </div>
        )}

        <div className="grid grid-cols-[80px_1fr] gap-4">
          <Field label="Emoji">
            <input
              type="text"
              value={form.emoji}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              maxLength={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
            />
          </Field>
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. HR Resources"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Active
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create category' : 'Save changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ─── Manage Categories Modal (list + entry point to create/edit/delete) ──────

interface ManageCategoriesModalProps {
  categories: ExternalLinkCategory[];
  onClose: () => void;
  onCreate: () => void;
  onEdit: (category: ExternalLinkCategory) => void;
  onDelete: (category: ExternalLinkCategory) => void;
}

const ManageCategoriesModal = ({ categories, onClose, onCreate, onEdit, onDelete }: ManageCategoriesModalProps) => (
  <ModalShell title="Manage Categories" icon={Settings2} onClose={onClose} maxWidth="max-w-md">
    <div className="space-y-2 mb-4">
      {categories.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No categories yet.</p>
      ) : (
        categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">{cat.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
                {!cat.is_active && <p className="text-[10px] text-gray-400">Inactive</p>}
              </div>
              {typeof cat.link_count === 'number' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full flex-shrink-0">
                  {cat.link_count} links
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onEdit(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition-colors" title="Edit category">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors" title="Delete category">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
    <button
      onClick={onCreate}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-500 hover:text-blue-600 rounded-xl text-sm font-medium transition-colors"
    >
      <FolderPlus className="h-4 w-4" />
      Add category
    </button>
  </ModalShell>
);

// ─── Confirm Delete Modal ──────────────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  label: string;
  description: string;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal = ({ label, description, saving, onConfirm, onCancel }: ConfirmDeleteModalProps) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <Trash2 className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Delete "{label}"?</h3>
      </div>
      <p className="text-sm text-gray-500 mb-6">{description}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Icon Preview ─────────────────────────────────────────────────────────────
// A dedicated component (not a locally-computed `const Icon = ...` binding)
// so the icon lookup lives inside a real component's own render rather than
// being assigned to a capitalized variable inside a parent component's body.
// That distinction matters only because of a known false positive in the
// React Compiler's `static-components` check, which otherwise misflags a
// stable lookup-table reference as "a component created during render."
// See: https://github.com/facebook/react/issues/34794
const IconPreview = ({ iconName, className }: { iconName: string; className?: string }) => {
  return createElement(getIcon(iconName), { className });
};

// ─── Small Field Wrapper ──────────────────────────────────────────────────────

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
    {children}
  </div>
);

// ─── Missing Icon ────────────────────────────────────────────────────────────
const LinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

export default SuperAdminLinks;