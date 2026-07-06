// src/components/templates/SuperAdminMemo.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { 
  selectCurrentUser, 
  selectUsersSignatureLoading, 
  uploadSignature, 
  deleteSignature 
} from '../../store/slices/userSlice';
import { createMemo } from '../../store/slices/documentSlice';
import { fetchUsers, selectAllUsers } from '../../store/slices/userSlice';
import {
  X,
  Loader2,
  Download,
  ChevronDown,
  Image,
  Upload,
  Trash2,
  FileText,
  Edit3,
  Printer,
  Plus,
  Minus,
  Send,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { generateAdminMemoDocx } from '../../utils/generateAdminMemoDocx';
import { generateAdminMemoPdf } from '../../utils/generateAdminMemoPdf';
import { uploadHelpdeskDocument, type DocumentEntityType, type DocumentFormat } from '../../store/slices/helpdeskDocumentsSlice';

// ─── Constants ──────────────────────────────────────────────────────────────

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminMemoData {
  to: string;
  from: string;
  cc?: string;
  ref: string;
  date: string;
  subject: string;
  body: string;
  signatoryName: string;
  signatureUrl?: string;
  crestUrl: string;
  footerEmblemUrl: string;
}

type DownloadFormat = 'docx' | 'pdf';

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function GoldButton({
  children,
  icon,
  type = 'button',
  disabled,
  onClick,
  size = 'default',
  variant = 'default',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'default';
  variant?: 'default' | 'danger' | 'success' | 'outline';
}) {
  const styles = {
    default: 'bg-[#c9a84c] text-[#1a3d1c] hover:bg-[#b8973f]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-[#c9a84c] text-[#1a3d1c] hover:bg-[#c9a84c]/10',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    default: 'px-4 py-2 text-sm',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition ${styles[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon}
      {children}
    </button>
  );
}

function GhostButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Helper Functions ──────────────────────────────────────────────────────

const getInitials = (fullName: string): string => {
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('');
};

// ─── Send Modal ──────────────────────────────────────────────────────────────

interface SendMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (userId: string, note: string, file?: File) => void;
  users: { id: string; full_name: string; email: string }[];
  loading: boolean;
  memoData: AdminMemoData;
  isGeneratingPDF: boolean;
}

const SendMemoModal: React.FC<SendMemoModalProps> = ({
  isOpen,
  onClose,
  onSend,
  users,
  loading,
  memoData,
  isGeneratingPDF,
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a recipient');
      return;
    }
    onSend(selectedUserId, note);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#1a3d1c] flex items-center gap-2">
            <Send size={18} className="text-[#c9a84c]" />
            Send Memo
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
          <p className="text-xs text-stone-500 font-medium">Memo Details</p>
          <p className="text-sm font-semibold text-stone-800 truncate">{memoData.subject || 'Untitled Memo'}</p>
          <p className="text-xs text-stone-400">Ref: {memoData.ref}</p>
          {isGeneratingPDF && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Generating PDF...
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Recipient *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
              required
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a brief note to the recipient..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GhostButton onClick={onClose} disabled={loading || isGeneratingPDF}>
              Cancel
            </GhostButton>
            <GoldButton
              type="submit"
              disabled={loading || isGeneratingPDF || !selectedUserId}
              icon={loading || isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            >
              {loading || isGeneratingPDF ? 'Sending...' : 'Send Memo'}
            </GoldButton>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────

interface SuperAdminMemoProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<AdminMemoData>;
  templateFile?: File | null;
  entityType?: DocumentEntityType;
  entityId?: string;
}

const SuperAdminMemo: React.FC<SuperAdminMemoProps> = ({
  isOpen,
  onClose,
  initialData,
  entityType = 'otherPayment',
  entityId,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);
  const allUsers = useAppSelector(selectAllUsers);

  // ── State ────────────────────────────────────────────────────────────────────

  const [toField, setToField] = useState(initialData?.to || '');
  const [fromField, setFromField] = useState(initialData?.from || 'REGISTRAR, HIGH COURT');
  const [ccField, setCcField] = useState(initialData?.cc || '');
  const [showCc, setShowCc] = useState(!!initialData?.cc);
  const [refField, setRefField] = useState(() => {
    if (initialData?.ref) return initialData.ref;
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RHC/ADMIN/${random}`;
  });
  const [dateField, setDateField] = useState(() =>
    initialData?.date || new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const [subjectField, setSubjectField] = useState(initialData?.subject || '');
  const [bodyText, setBodyText] = useState(initialData?.body || '');

  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const signatoryName = currentUser?.full_name || '';
  const userInitials = getInitials(signatoryName);
  
  const lastLoadedFileRef = useRef<File | null>(null);
  const usersLoadedRef = useRef(false);

  // ── Load users for send modal ──────────────────────────────────────────────

  useEffect(() => {
    if (showSendModal && !usersLoadedRef.current && allUsers.length === 0) {
      usersLoadedRef.current = true;
      setLoadingUsers(true);
      dispatch(fetchUsers({ is_active: true, limit: 100 }))
        .finally(() => setLoadingUsers(false));
    }
    if (!showSendModal) {
      usersLoadedRef.current = false;
    }
  }, [showSendModal, allUsers.length, dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSignatureUpload = async (file: File) => {
    try {
      await dispatch(uploadSignature(file)).unwrap();
      toast.success('Signature uploaded successfully.');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to upload signature.');
    }
  };

  const handleSignatureRemove = async () => {
    if (!currentUser?.signature_url) return;
    try {
      await dispatch(deleteSignature()).unwrap();
      toast.success('Signature removed successfully.');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to remove signature.');
    }
  };

  const buildMemoData = (): AdminMemoData => ({
    to: toField,
    from: fromField,
    cc: showCc ? ccField : undefined,
    ref: refField,
    date: dateField,
    subject: subjectField,
    body: bodyText,
    signatoryName,
    signatureUrl: currentUser?.signature_url || undefined,
    crestUrl: JUDICIARY_CREST_SRC,
    footerEmblemUrl: FOOTER_EMBLEM_SRC,
  });

  // ─── Updated handleDownload with upload functionality ────────────────────

  const handleDownload = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);

    try {
      const memoData = buildMemoData();

      // ── Step 1: Generate the Blob ──────────────────────────────────────────
      let blob: Blob | null = null;

      if (format === 'docx') {
        blob = await generateAdminMemoDocx(memoData);
      } else if (format === 'pdf') {
        blob = await generateAdminMemoPdf(memoData);
      }

      if (!blob) {
        throw new Error('Generator returned no blob');
      }

      // ── Step 2: Upload to the helpdesk system ─────────────────────────────
      const safeRef = (refField || 'memo').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `${safeRef}.${format}`;

      await uploadHelpdeskDocument({
        blob,
        filename,
        ref: refField,
        subject: subjectField || 'Admin Memo',
        entity_type: entityType,
        entity_id: entityId || undefined,
        format: format as DocumentFormat,
      });

      toast.success(`${format.toUpperCase()} document saved to the system.`);

      // ── Optional: Also allow local download ──────────────────────────────
      // Uncomment if you want both behaviors:
      // const url = URL.createObjectURL(blob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = filename;
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
      // URL.revokeObjectURL(url);

    } catch (err) {
      console.error(`Failed to generate/upload ${format} memo:`, err);
      toast.error('Failed to save document. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ── Send Memo Handler ──────────────────────────────────────────────────────

  const handleOpenSendModal = () => {
    if (!bodyText.trim()) {
      toast.error('Please add content to the memo before sending.');
      return;
    }
    setShowSendModal(true);
  };

  const handleSendMemo = async (recipientId: string, note: string) => {
    setIsSending(true);
    setIsGeneratingPDF(true);
    try {
      const memoData = buildMemoData();
      
      // Generate PDF blob
      const pdfBlob = await generateAdminMemoPdf(memoData);
      const pdfFile = new File([pdfBlob], `Memo_${memoData.ref || 'untitled'}.pdf`, { type: 'application/pdf' });
      
      // Create and send the memo via the API
      await dispatch(createMemo({
        data: {
          to: memoData.to,
          from: memoData.from,
          cc: memoData.cc,
          ref: memoData.ref,
          date: memoData.date,
          subject: memoData.subject,
          body: memoData.body,
          recipient_id: recipientId,
          note: note,
        },
        file: pdfFile,
      })).unwrap();

      // Also save to helpdesk system
      try {
        await uploadHelpdeskDocument({
          blob: pdfBlob,
          filename: `Memo_${memoData.ref || 'untitled'}.pdf`,
          ref: memoData.ref,
          subject: memoData.subject || 'Admin Memo',
          entity_type: entityType,
          entity_id: entityId || undefined,
          format: 'pdf',
        });
      } catch (uploadErr) {
        console.warn('Failed to save to helpdesk:', uploadErr);
        // Don't fail the send if upload fails
      }

      toast.success('Memo sent successfully!');
      setShowSendModal(false);
      onClose();
    } catch (err) {
      console.error('Failed to send memo:', err);
      toast.error('Failed to send memo. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
      setIsSending(false);
    }
  };

  const handleClose = () => {
    lastLoadedFileRef.current = null;
    onClose();
  };

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Preparing Word…',
    pdf: 'Preparing PDF…',
  };

  const isBodyEmpty = !bodyText.trim();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#1c1917' },
            success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
            error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
        <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Edit3 size={18} className="text-[#c9a84c]" />
              <h3 className="text-sm font-semibold text-[#1a3d1c]">Super Admin Memo</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                title="Print"
              >
                <Printer size={16} />
              </button>
              <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
            {/* Signature */}
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Image size={16} className="text-[#c9a84c]" />
                  <h4 className="text-sm font-semibold text-stone-800">Digital Signature</h4>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSignatureUpload(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="memo-signature-upload"
                    disabled={signatureLoading}
                  />
                  <label
                    htmlFor="memo-signature-upload"
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                  >
                    {signatureLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {signatureLoading ? 'Uploading…' : 'Upload Signature'}
                  </label>
                  {currentUser?.signature_url && (
                    <GhostButton onClick={handleSignatureRemove} disabled={signatureLoading} icon={<Trash2 size={14} />}>
                      Remove
                    </GhostButton>
                  )}
                </div>
              </div>
              {currentUser?.signature_url ? (
                <div className="flex items-center gap-4 p-3 bg-white rounded border border-stone-200">
                  <img src={currentUser.signature_url} alt="Your signature" className="max-h-16 w-auto object-contain" />
                  <span className="text-xs text-stone-500">✓ Signature uploaded</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-white rounded border border-dashed border-stone-300">
                  <Image size={20} className="text-stone-400" />
                  <div>
                    <p className="text-sm text-stone-600">No signature uploaded</p>
                    <p className="text-xs text-stone-400">Upload your signature to include it in the memo</p>
                  </div>
                </div>
              )}
            </div>

            {/* Memo Editor */}
            <div className="border border-stone-300 bg-white p-6 shadow-sm font-sans text-black">
              {/* Crest */}
              <div className="flex justify-center mb-3">
                <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-20 w-auto object-contain" />
              </div>

              {/* Header */}
              <div className="text-center mb-6">
                <p className="text-lg font-bold uppercase leading-snug">OFFICE OF THE REGISTRAR HIGH COURT</p>
                <p className="text-lg font-bold uppercase leading-snug inline-block px-1">
                  INTERNAL MEMO
                </p>
                <div className="w-full border-b-2 border-black mt-1" />
              </div>

              {/* Fields */}
              <div className="space-y-2 text-sm font-bold mb-8">
                <div className="flex items-center">
                  <span className="w-20 shrink-0">TO</span>
                  <span className="w-4 shrink-0">:</span>
                  <input
                    type="text"
                    value={toField}
                    onChange={(e) => setToField(e.target.value)}
                    placeholder="RECIPIENT NAME"
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-1 -mx-1 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase"
                  />
                </div>
                <div className="flex items-center">
                  <span className="w-20 shrink-0">FROM</span>
                  <span className="w-4 shrink-0">:</span>
                  <input
                    type="text"
                    value={fromField}
                    onChange={(e) => setFromField(e.target.value)}
                    placeholder="SENDER NAME"
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-1 -mx-1 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase"
                  />
                </div>
                {showCc && (
                  <div className="flex items-center">
                    <span className="w-20 shrink-0">CC</span>
                    <span className="w-4 shrink-0">:</span>
                    <input
                      type="text"
                      value={ccField}
                      onChange={(e) => setCcField(e.target.value)}
                      placeholder="CARBON COPY RECIPIENTS"
                      className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-1 -mx-1 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCc(!showCc)}
                    className="text-xs text-[#c9a84c] hover:text-[#b8973f] font-medium flex items-center gap-1"
                  >
                    {showCc ? <Minus size={14} /> : <Plus size={14} />}
                    {showCc ? 'Remove CC' : 'Add CC'}
                  </button>
                </div>
                <div className="flex items-center">
                  <span className="w-20 shrink-0">REF</span>
                  <span className="w-4 shrink-0">:</span>
                  <input
                    type="text"
                    value={refField}
                    onChange={(e) => setRefField(e.target.value)}
                    placeholder="REFERENCE NUMBER"
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-1 -mx-1 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase"
                  />
                </div>
                <div className="flex items-center">
                  <span className="w-20 shrink-0">DATE</span>
                  <span className="w-4 shrink-0">:</span>
                  <input
                    type="text"
                    value={dateField}
                    onChange={(e) => setDateField(e.target.value)}
                    placeholder="dd MMM yyyy"
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-1 -mx-1 hover:border-stone-300 focus:border-stone-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center border-b-2 border-black pb-3">
                  <span className="w-20 shrink-0">SUBJECT</span>
                  <span className="w-4 shrink-0">:</span>
                  <input
                    type="text"
                    value={subjectField}
                    onChange={(e) => setSubjectField(e.target.value)}
                    placeholder="MEMO SUBJECT"
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-1 -mx-1 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Body */}
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={12}
                placeholder="Enter the memo content here..."
                className={`w-full bg-transparent border-0 border-b border-dashed border-transparent px-1 -mx-1 hover:border-stone-300 focus:border-stone-500 focus:outline-none resize-y text-sm leading-relaxed ${isBodyEmpty ? 'text-stone-400' : 'text-stone-800'}`}
                style={{ minHeight: '200px' }}
              />

              {/* Sign-off */}
              <div className="mt-16 space-y-1">
                <p className="text-sm font-bold text-black">{signatoryName}</p>
                {currentUser?.signature_url && (
                  <div className="py-1">
                    <img src={currentUser.signature_url} alt="Signature" className="max-h-12 w-auto object-contain" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <input
                    type="text"
                    value={fromField}
                    onChange={(e) => setFromField(e.target.value)}
                    className="block w-full bg-transparent border-0 border-b border-dashed border-transparent px-1 -mx-1 hover:border-stone-300 focus:border-stone-500 focus:outline-none text-sm font-bold underline uppercase"
                  />
                  <p className="text-xs font-mono text-stone-600 mt-0.5">RHC/{userInitials}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-3 border-t border-stone-300 flex items-center justify-between gap-3">
                <img src={FOOTER_EMBLEM_SRC} alt="" className="h-10 w-auto object-contain shrink-0" />
                <div className="text-[10px] leading-tight text-stone-700 text-right">
                  <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
                  <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
                  <p className="mt-1 font-bold text-emerald-800">Justice Be Our Shield and Defender</p>
                </div>
              </div>
            </div>

            {/* Character count */}
            <div className="flex justify-end">
              <span className="text-xs text-stone-400">
                {bodyText.length} characters
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between border-t border-stone-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">
                Signed as: <span className="font-medium text-stone-600">{signatoryName || 'Not signed in'}</span>
              </span>
            </div>
            <div className="flex gap-2">
              <GoldButton
                size="sm"
                onClick={handleOpenSendModal}
                disabled={isSending || isBodyEmpty}
                icon={isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              >
                {isSending ? 'Sending...' : 'Send'}
              </GoldButton>

              <GhostButton onClick={handleClose}>Close</GhostButton>

              <div className="relative">
                <GoldButton
                  size="sm"
                  onClick={() => setShowDownloadMenu((v) => !v)}
                  disabled={downloadingFormat !== null || isBodyEmpty}
                  icon={downloadingFormat ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                >
                  {downloadingFormat ? downloadLabels[downloadingFormat] : 'Download'}
                  {!downloadingFormat && <ChevronDown size={12} />}
                </GoldButton>
                {showDownloadMenu && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setShowDownloadMenu(false)} />
                    <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={() => handleDownload('docx')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                      >
                        <FileText size={14} className="text-blue-600" /> Word (.docx)
                      </button>
                      <button
                        onClick={() => handleDownload('pdf')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                      >
                        <FileText size={14} className="text-red-600" /> PDF (.pdf)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Modal */}
      <SendMemoModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={handleSendMemo}
        users={allUsers.map(u => ({ id: u.id, full_name: u.full_name, email: u.email }))}
        loading={loadingUsers || isSending}
        memoData={buildMemoData()}
        isGeneratingPDF={isGeneratingPDF}
      />
    </>
  );
};

export default SuperAdminMemo;