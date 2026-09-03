// src/pages/admin/DRSignatureManagement.tsx

import React, { useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { 
  uploadSignature, 
  deleteSignature, 
  fetchCurrentUser,
  selectCurrentUser,
  selectUsersSignatureLoading,
  selectUsersMutating,
  selectUsersError,
  selectUsersSuccess,
} from '../../store/slices/userSlice';
import { toast } from 'react-hot-toast';

// Spinner component
const Spinner: React.FC<{ className?: string }> = ({ className = "h-3.5 w-3.5" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const DRSignatureManagement = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectUsersSignatureLoading);
  const isMutating = useAppSelector(selectUsersMutating);
  const error = useAppSelector(selectUsersError);
  const success = useAppSelector(selectUsersSuccess);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSignature = currentUser?.signature_url && currentUser.signature_url !== null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WEBP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    try {
      await dispatch(uploadSignature(selectedFile)).unwrap();
      toast.success('Signature uploaded successfully!');
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      dispatch(fetchCurrentUser());
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to upload signature');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your signature?')) return;

    try {
      await dispatch(deleteSignature()).unwrap();
      toast.success('Signature deleted successfully');
      dispatch(fetchCurrentUser());
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to delete signature');
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Signature Management</h2>
            <p className="text-sm text-stone-500">
              Upload and manage your digital signature for document signing
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Current Signature Display */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Current Signature</h3>
          {hasSignature ? (
            <div className="flex items-center gap-4">
              <div className="border-2 border-stone-200 rounded-lg p-4 bg-stone-50">
                {/* FIX: Use || undefined to convert null to undefined */}
                <img 
                  src={currentUser.signature_url || undefined} 
                  alt="Your signature" 
                  className="max-h-20 object-contain"
                />
              </div>
              <div className="text-sm text-stone-500">
                <p>✅ Signature uploaded</p>
                <p className="text-xs text-stone-400 mt-1">
                  Uploaded on {new Date(currentUser.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-700">
                No signature uploaded. Please upload your signature to sign documents.
              </p>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="border-t border-stone-200 pt-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Upload New Signature</h3>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              previewUrl ? 'border-green-400 bg-green-50' : 'border-stone-300 hover:border-amber-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {previewUrl ? (
              <div className="flex flex-col items-center gap-3">
                <img 
                  src={previewUrl} 
                  alt="Signature preview" 
                  className="max-h-24 object-contain border border-stone-200 rounded-lg p-2 bg-white"
                />
                <p className="text-sm text-stone-600">
                  {selectedFile?.name} ({(selectedFile?.size && (selectedFile.size / 1024).toFixed(1)) || '0'} KB)
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="h-12 w-12 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm text-stone-600">Click to upload your signature</p>
                <p className="text-xs text-stone-400">PNG, JPG, GIF, WEBP (max 2MB)</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            {previewUrl && (
              <button
                onClick={handleUpload}
                disabled={isMutating || isLoading}
                className="flex-1 bg-[#1E4620] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#163a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isMutating || isLoading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Uploading...
                  </>
                ) : (
                  'Upload Signature'
                )}
              </button>
            )}
            
            {hasSignature && (
              <button
                onClick={handleDelete}
                disabled={isMutating || isLoading}
                className="flex-1 border border-red-200 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Signature
              </button>
            )}
          </div>
        </div>

        {/* Guidelines */}
        <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Guidelines</h4>
          <ul className="text-xs text-stone-600 space-y-1 list-disc list-inside">
            <li>Use a clear, high-contrast image of your signature on white background</li>
            <li>Recommended size: 300x100 pixels or larger</li>
            <li>Maximum file size: 2MB</li>
            <li>Supported formats: PNG, JPG, GIF, WEBP</li>
            <li>Your signature will be embedded in PDF documents when you sign</li>
          </ul>
        </div>

        {success && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-700">✓ Signature updated successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DRSignatureManagement;