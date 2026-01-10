import { toast } from 'sonner';
import { ConfirmToast } from '../components/ui/ConfirmToast';

export const confirmAction = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    toast.custom((t) => (
      <ConfirmToast
        t={t}
        message={message}
        onConfirm={() => {
            window.electronAPI.log('info', `Action confirmed: ${message}`);
            resolve(true);
        }}
        onCancel={() => {
            window.electronAPI.log('info', `Action cancelled: ${message}`);
            resolve(false);
        }}
      />
    ), {
      duration: Infinity, // Prevent auto-dismiss so user has to interact
    });
  });
};
