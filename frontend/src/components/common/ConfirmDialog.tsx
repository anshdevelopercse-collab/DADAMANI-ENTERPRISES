import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
}

/** Standard confirmation dialog for destructive actions (delete, end an allocation, etc.) — per the brief's "confirmation for destructive actions" requirement. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = true,
  isLoading = false,
}) => (
  <Modal isOpen={isOpen} onClose={onCancel} title="" size="sm">
    <div className="flex gap-4">
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${destructive ? 'bg-rose-500/10 text-rose-400' : 'bg-sky-500/10 text-sky-400'}`}>
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      </div>
    </div>
    <div className="flex items-center justify-end gap-3 mt-6">
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 ${
          destructive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-sky-600 hover:bg-sky-500'
        }`}
      >
        {isLoading ? 'Please wait…' : confirmLabel}
      </button>
    </div>
  </Modal>
);
