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

    let data: Record<string, string> = {};

    try {
      if (!fs.existsSync(DATA_PATH)) {
        return null;
      }

      data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
      if (!data[key]) return null;

      const buffer = Buffer.from(data[key], 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      return decrypted;
    } catch (error) {
      console.warn(`[Security] Failed to decrypt credentials for '${key}'. Clearing invalid data.`);
      
      // Self-healing: remove the invalid entry
      try {
          if (data[key]) {
              delete data[key];
              fs.writeFileSync(DATA_PATH, JSON.stringify(data));
          }
      } catch (writeError) {
          console.error('[Security] Failed to clean up invalid credentials:', writeError);
      }

      return null;
    }
  },

  getAllCredentials: (decrypt: boolean = true): Record<string, string> => {
      if (!safeStorage.isEncryptionAvailable()) return {};
      
      try {
          if (!fs.existsSync(DATA_PATH)) return {};
          const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
          
          if (!decrypt) {
              return data;
          }

          const decrypted: Record<string, string> = {};
          
          for (const [key, value] of Object.entries(data)) {
              try {
                  const buffer = Buffer.from(value as string, 'base64');
                  decrypted[key] = safeStorage.decryptString(buffer);
              } catch (e) {
                  console.warn(`Failed to decrypt ${key} during export`);
              }
          }
          return decrypted;
      } catch (error) {
          console.error('Failed to get all credentials:', error);
          return {};
      }
  },

  setAllCredentials: (credentials: Record<string, string>, isRaw: boolean = false): boolean => {
      if (!safeStorage.isEncryptionAvailable()) return false;

      try {
          if (isRaw) {
              fs.writeFileSync(DATA_PATH, JSON.stringify(credentials));
              return true;
          }

          const encrypted: Record<string, string> = {};
          for (const [key, value] of Object.entries(credentials)) {
              const enc = safeStorage.encryptString(value);
              encrypted[key] = enc.toString('base64');
          }
          fs.writeFileSync(DATA_PATH, JSON.stringify(encrypted));
          return true;
      } catch (error) {
          console.error('Failed to set all credentials:', error);
          return false;
      }
  },

  clear: (): boolean => {
      try {
          if (fs.existsSync(DATA_PATH)) {
              fs.unlinkSync(DATA_PATH);
          }
          return true;
      } catch (error) {
          console.error('Failed to clear credentials:', error);
          return false;
      }
  }
};
