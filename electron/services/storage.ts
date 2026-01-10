import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const getDataPath = () => path.join(app.getPath('userData'), 'app-data.json');

export const StorageService = {
  saveData: (key: string, value: any): boolean => {
    try {
      const dataPath = getDataPath();
      let data: Record<string, any> = {};
      if (fs.existsSync(dataPath)) {
        try {
            data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        } catch (e) {
            console.error('Error parsing storage file, resetting:', e);
            data = {};
        }
      }

      data[key] = value;

      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  },

  getData: (key: string): any | null => {
    try {
      const dataPath = getDataPath();
      if (!fs.existsSync(dataPath)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      return data[key] ?? null;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return null;
    }
  },

  getAllData: (): Record<string, any> => {
      try {
          const dataPath = getDataPath();
          if (!fs.existsSync(dataPath)) return {};
          return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      } catch (error) {
          console.error('Failed to get all data:', error);
          return {};
      }
  },

  setAllData: (data: Record<string, any>): boolean => {
      try {
          const dataPath = getDataPath();
          fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
          return true;
      } catch (error) {
          console.error('Failed to set all data:', error);
          return false;
      }
  },

  clear: (): boolean => {
      try {
          const dataPath = getDataPath();
          if (fs.existsSync(dataPath)) {
              fs.unlinkSync(dataPath);
          }
          return true;
      } catch (error) {
          console.error('Failed to clear storage:', error);
          return false;
      }
  }
};
