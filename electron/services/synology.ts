import axios from 'axios';
import { StorageService } from './storage';

export class SynologyService {
  private sid: string | null = null;
  private baseUrl: string = '';

  constructor() {
    this.baseUrl = StorageService.getData('synology_url') || '';
  }

  private async getSid(): Promise<string | null> {
    if (this.sid) return this.sid;
    
    const url = StorageService.getData('synology_url');
    const user = StorageService.getData('synology_user');
    const pass = StorageService.getData('synology_password');
    
    if (!url || !user || !pass) return null;
    
    await this.login(url, user, pass);
    return this.sid;
  }

  async login(url: string, user: string, pass: string): Promise<boolean> {
    try {
      const cleanUrl = url.replace(/\/$/, '');
      const response = await axios.get(`${cleanUrl}/webapi/auth.cgi`, {
        params: {
          api: 'SYNO.API.Auth',
          version: 3,
          method: 'login',
          account: user,
          passwd: pass,
          session: 'Core',
          format: 'sid'
        }
      });

      if (response.data?.success) {
        this.sid = response.data.data.sid;
        this.baseUrl = cleanUrl;
        return true;
      }
      return false;
    } catch (e) {
      console.error('Synology login failed:', e);
      return false;
    }
  }

  async getSystemData(): Promise<any> {
    const sid = await this.getSid();
    if (!sid) throw new Error('Not authenticated');

    try {
      const [utilization, storage] = await Promise.all([
        axios.get(`${this.baseUrl}/webapi/entry.cgi`, {
          params: {
            api: 'SYNO.Core.System.Utilization',
            method: 'get',
            version: 1,
            _sid: sid
          }
        }),
        axios.get(`${this.baseUrl}/webapi/entry.cgi`, {
          params: {
            api: 'SYNO.Storage.CGI.Storage',
            method: 'load_info',
            version: 1,
            _sid: sid
          }
        })
      ]);

      return {
        utilization: utilization.data?.data,
        storage: storage.data?.data
      };
    } catch (e) {
      console.error('Synology getSystemData error:', e);
      // If error is due to invalid session (105), clear sid
      this.sid = null;
      throw e;
    }
  }

  async executeAction(action: 'reboot' | 'shutdown'): Promise<boolean> {
     const sid = await this.getSid();
     if (!sid) return false;
     
     try {
         const response = await axios.get(`${this.baseUrl}/webapi/entry.cgi`, {
             params: {
                 api: 'SYNO.Core.System',
                 method: action,
                 version: 1,
                 _sid: sid
             }
         });
         return response.data?.success || false;
     } catch (e) {
         console.error(e);
         return false;
     }
  }
}

export const synologyService = new SynologyService();
