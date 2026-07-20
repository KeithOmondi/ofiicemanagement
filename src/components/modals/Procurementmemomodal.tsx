// ─── Procurement Memo Modal (rewritten to match UtilitiesMemoModal pattern) ──
// Key changes from the original:
//  1. Pulls in the same signature infra as UtilitiesModal.tsx (selectCurrentUser,
//     selectUsersSignatureLoading, uploadSignature, deleteSignature) instead of a
//     free-text "Signatory Name" field with no actual signature image.
//  2. Renders a live styled document preview (crest, title block, underlined
//     inline-editable fields, a real item table, signature image) instead of a
//     stacked plain form — mirroring what UtilitiesMemoModal already does.
//  3. Passes crestUrl/signatureUrl into the PDF/Excel generators, which already
//     accept them (ProcurementMemoData has always had these fields) but were
//     never actually being given values.

import React, { useState } from 'react';
import {
  Loader2,
  Send,
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Image,
  Upload,
  Trash2,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  selectCurrentUser,
  selectUsersSignatureLoading,
  uploadSignature,
  deleteSignature,
} from '../../store/slices/userSlice';
import { generateProcurementMemoPdf } from '../../utils/generateProcurementMemoPdf';
import { generateProcurementMemoExcel } from '../../utils/generateProcurementMemoExcel';
import type {
  selectProcurementRequests,
  SubmitProcurementMemoInput,
} from '../../store/slices/inventorySlice';
import toast from 'react-hot-toast';

const JUDICIARY_CREST_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg';
const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

type DownloadFormat = 'pdf' | 'xlsx';

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

export const ProcurementMemoModal: React.FC<{
  request: ReturnType<typeof selectProcurementRequests>[0];
  onClose: () => void;
  onSubmit: (data: SubmitProcurementMemoInput) => Promise<void>;
  loading: boolean;
}> = ({ request, onClose, onSubmit, loading }) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);

  const [toField, setToField] = useState('REGISTRAR, HIGH COURT / ORHC AIE HOLDER');
  const [fromField, setFromField] = useState('PROCUREMENT OFFICE - ORHC');
  const [refField, setRefField] = useState(
    `PROC/${request.id.slice(0, 8)}/${new Date().getFullYear()}`
  );
  const [dateField, setDateField] = useState(
    new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const [subjectField, setSubjectField] = useState(
    `Procurement Request: ${request.item_name}`
  );
  const [bodyField, setBodyField] = useState(
    `This is a procurement request for ${request.quantity} ${request.unit} of ${request.item_name}.\n\nJustification: ${request.justification}`
  );

  const signatoryName = currentUser?.full_name || request.requested_by_name || 'Procurement Officer';

  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

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

  const estimatedCost = request.estimated_unit_cost;
  const totalCost = estimatedCost ? estimatedCost * request.quantity : 0;
  const formatAmount = (n: number) =>
    n > 0 ? n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

  const buildMemoData = () => ({
    to: toField,
    from: fromField,
    ref: refField,
    date: dateField,
    subject: subjectField,
    bodyText: bodyField,
    itemName: request.item_name,
    quantity: request.quantity,
    unit: request.unit,
    estimatedCost: request.estimated_unit_cost,
    urgency: request.urgency,
    justification: request.justification,
    requestedBy: request.requested_by_name || '',
    signatoryName,
    crestUrl: JUDICIARY_CREST_SRC,
    footerEmblemUrl: FOOTER_EMBLEM_SRC,
    signatureUrl: currentUser?.signature_url || undefined,
  });

  const handleDownload = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);
    try {
      const memoData = buildMemoData();

      if (format === 'pdf') {
        const blob = await generateProcurementMemoPdf(memoData);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${refField}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const blob = generateProcurementMemoExcel(memoData);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${refField}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(`Failed to generate ${format} memo:`, err);
      toast.error('Failed to generate document. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleSubmit = async () => {
    try {
      await onSubmit({
        to: toField,
        from: fromField,
        ref: refField,
        date: dateField,
        subject: subjectField,
        body: bodyField,
        signatoryName,
      });
    } catch {
      // error already surfaced by parent
    }
  };

  const downloadLabels: Record<DownloadFormat, string> = {
    pdf: 'Preparing PDF…',
    xlsx: 'Preparing Excel…',
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">Generate Procurement Memo</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          {/* ── Signature (same pattern as UtilitiesMemoModal) ───────────── */}
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
                  id="procurement-signature-upload"
                  disabled={signatureLoading}
                />
                <label
                  htmlFor="procurement-signature-upload"
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

          {/* ── Live memo preview (same visual pattern as UtilitiesMemoModal) ─ */}
          <div className="border border-stone-300 bg-white p-10 shadow-sm font-sans text-black">
            <div className="flex justify-center mb-3">
              <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-20 w-auto object-contain" />
            </div>

            <div className="text-center mb-6">
              <p className="text-lg font-bold uppercase leading-snug">OFFICE OF THE REGISTRAR HIGH COURT</p>
              <p className="text-lg font-bold uppercase leading-snug border-b-2 border-black inline-block pb-2 px-1">
                INTERNAL MEMO
              </p>
            </div>

            <div className="space-y-3 text-sm font-bold mb-8">
              <div className="flex">
                <span className="w-24 shrink-0">FROM</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={fromField}
                  onChange={(e) => setFromField(e.target.value)}
                  className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase"
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">TO</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={toField}
                  onChange={(e) => setToField(e.target.value)}
                  className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase"
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">REF</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={refField}
                  onChange={(e) => setRefField(e.target.value)}
                  className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none"
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">DATE</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value)}
                  className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none"
                />
              </div>
              <div className="flex border-b-2 border-black pb-3">
                <span className="w-24 shrink-0">SUBJECT</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={subjectField}
                  onChange={(e) => setSubjectField(e.target.value)}
                  className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            <textarea
              value={bodyField}
              onChange={(e) => setBodyField(e.target.value)}
              rows={6}
              className="w-full bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none resize-none text-sm leading-relaxed mb-6"
            />

            {/* Item table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-black">
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-1 text-left text-xs font-bold">ITEM</th>
                    <th className="border border-black px-2 py-1 text-center text-xs font-bold">QTY</th>
                    <th className="border border-black px-2 py-1 text-center text-xs font-bold">UNIT</th>
                    <th className="border border-black px-2 py-1 text-right text-xs font-bold">UNIT COST</th>
                    <th className="border border-black px-2 py-1 text-right text-xs font-bold">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black px-2 py-1 font-medium">{request.item_name}</td>
                    <td className="border border-black px-2 py-1 text-center">{request.quantity}</td>
                    <td className="border border-black px-2 py-1 text-center">{request.unit}</td>
                    <td className="border border-black px-2 py-1 text-right">
                      {estimatedCost ? formatAmount(estimatedCost) : '—'}
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-medium">
                      {totalCost ? formatAmount(totalCost) : '—'}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="border border-black px-2 py-2 text-right font-bold">
                      GRAND TOTAL
                    </td>
                    <td className="border border-black px-2 py-2 text-right font-bold">
                      {totalCost ? formatAmount(totalCost) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Sign-off — matches UtilitiesMemoModal's structure */}
            <div className="mt-16 space-y-1">
              <p className="text-sm font-bold text-black">{signatoryName}</p>
              {currentUser?.signature_url && (
                <div className="py-1">
                  <img src={currentUser.signature_url} alt="Signature" className="max-h-12 w-auto object-contain" />
                </div>
              )}
              <input
                type="text"
                value={fromField}
                onChange={(e) => setFromField(e.target.value)}
                className="block w-full bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none text-sm font-bold underline uppercase"
              />
            </div>

            <div className="mt-12 pt-3 border-t border-stone-300 flex items-center justify-between gap-3">
              <img src={FOOTER_EMBLEM_SRC} alt="" className="h-10 w-auto object-contain shrink-0" />
              <div className="text-[10px] leading-tight text-stone-700 text-right">
                <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
                <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
                <p className="mt-1 font-bold text-emerald-800">Justice Be Our Shield and Defender</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between border-t border-stone-100 px-4 py-3">
          <div />
          <div className="flex gap-2">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu((v) => !v)}
                disabled={downloadingFormat !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {downloadingFormat ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {downloadingFormat ? downloadLabels[downloadingFormat] : 'Download'}
                {!downloadingFormat && <ChevronDown size={12} />}
              </button>
              {showDownloadMenu && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setShowDownloadMenu(false)} />
                  <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={() => handleDownload('pdf')}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                    >
                      <FileText size={14} className="text-red-600" /> PDF (.pdf)
                    </button>
                    <button
                      onClick={() => handleDownload('xlsx')}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" /> Excel (.xlsx)
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a18] disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit for Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementMemoModal;