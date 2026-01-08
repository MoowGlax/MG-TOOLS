import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const DATA_PATH = path.join(app.getPath('userData'), 'app-data.json');

export const StorageService = {
  saveData: (key: string, value: any): boolean => {
    try {
      let data: Record<string, any> = {};
      if (fs.existsSync(DATA_PATH)) {
        try {
            data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
        } catch (e) {
            console.error('Error parsing storage file, resetting:', e);
            data = {};
        }
      }

      data[key] = value;

      fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  },

  getData: (key: string): any | null => {
    try {
      if (!fs.existsSync(DATA_PATH)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
      return data[key] ?? null;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return null;
    }
  }
};
