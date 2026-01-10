import { toast } from 'sonner';

interface ConfirmToastProps {
  t: string | number;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmToast({ t, message, onConfirm, onCancel }: ConfirmToastProps) {
  return (
    <div className="flex flex-col gap-3 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-lg">
      <div className="font-medium text-sm">{message}</div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => {
            toast.dismiss(t);
            onCancel?.();
          }}
          className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => {
            toast.dismiss(t);
            onConfirm();
          }}
          className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Confirmer
        </button>
      </div>
    </div>
  );
}
