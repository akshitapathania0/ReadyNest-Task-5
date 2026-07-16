import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  id: string;
  url?: string;
  error?: string;
}

interface FileUploaderProps {
  projectId?: string;
  folder?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
  onSuccess?: (file: unknown) => void;
}

export function FileUploader({
  projectId,
  folder = 'root',
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB
  onSuccess,
}: FileUploaderProps) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const qc = useQueryClient();

  const updateUpload = (id: string, update: Partial<UploadFile>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...update } : u)));
  };

  const uploadFile = async (file: File) => {
    const id = `${Date.now()}-${Math.random()}`;
    setUploads((prev) => [...prev, { file, progress: 0, status: 'uploading', id }]);

    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('projectId', projectId);
    formData.append('folder', folder);
    formData.append('visibility', 'workspace');

    try {
      const { data } = await apiClient.files.upload(formData, (pct) => {
        updateUpload(id, { progress: pct });
      });

      updateUpload(id, { status: 'done', progress: 100, url: data.data.cloudinaryUrl });
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success(`${file.name} uploaded`);
      onSuccess?.(data.data);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Upload failed';
      updateUpload(id, { status: 'error', error: msg });
      toast.error(msg);
    }
  };

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      rejected.forEach((r) => {
        const reason = r.errors[0]?.message || 'File rejected';
        toast.error(`${r.file.name}: ${reason}`);
      });
      accepted.forEach(uploadFile);
    },
    [folder, projectId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept: accept || {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/zip': ['.zip'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const active = uploads.filter((u) => u.status === 'uploading');
  const done = uploads.filter((u) => u.status === 'done');

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragActive
            ? 'border-blue-500 bg-blue-500/5 text-blue-400'
            : 'border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="text-3xl mb-3">☁️</div>
        {isDragActive ? (
          <p className="font-medium">Drop to upload</p>
        ) : (
          <>
            <p className="font-medium mb-1">Drop files here or click to browse</p>
            <p className="text-sm text-[var(--text-muted)]">
              Images, PDFs, videos, ZIP · Max {Math.round(maxSize / 1024 / 1024)}MB per file
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Stored via Cloudinary CDN</p>
          </>
        )}
      </div>

      {/* Active uploads */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm truncate flex-1 mr-3">{u.file.name}</span>
                <span className="text-xs text-[var(--text-muted)] shrink-0">
                  {u.status === 'uploading' && `${u.progress}%`}
                  {u.status === 'done' && '✓ Done'}
                  {u.status === 'error' && '✕ Failed'}
                </span>
              </div>
              <div className="h-1 bg-[var(--surface-0)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    u.status === 'error' ? 'bg-red-500' : u.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              {u.error && <p className="text-xs text-red-400 mt-1">{u.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
