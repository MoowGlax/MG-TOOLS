import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const DATA_PATH = path.join(app.getPath('userData'), 'secure-data.json');

export const SecurityService = {
  saveCredentials: (key: string, value: string): boolean => {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('Encryption is not available');
      return false;
    }

    try {
      let data: Record<string, string> = {};
      if (fs.existsSync(DATA_PATH)) {
        data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
      }

      const encrypted = safeStorage.encryptString(value);
      data[key] = encrypted.toString('base64');

      fs.writeFileSync(DATA_PATH, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save credentials:', error);
      return false;
    }
  },

  getCredentials: (key: string): string | null => {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }

    try {
      if (!fs.existsSync(DATA_PATH)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
      if (!data[key]) return null;

      const buffer = Buffer.from(data[key], 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      return decrypted;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }
};
