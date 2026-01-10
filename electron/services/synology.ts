import axios from 'axios';
import { StorageService } from './storage';
import { SecurityService } from './security';
import * as https from 'https';

export class SynologyService {
  private sid: string | null = null;
  private baseUrl: string = '';

  constructor() {
    // Delay initialization to ensure Services work
  }

  private async getSid(): Promise<string | null> {
    if (this.sid) return this.sid;
    
    // Always fetch latest credentials from SecurityService
    const url = SecurityService.getCredentials('synology_url');
    const user = SecurityService.getCredentials('synology_user');
    const pass = SecurityService.getCredentials('synology_password');
    
    if (!url || !user || !pass) {
        console.warn('Synology credentials missing');
        return null;
    }
    
    // Update base URL if it changed
    if (url !== this.baseUrl) this.baseUrl = url.replace(/\/$/, '');
    
    const success = await this.login(url, user, pass);
    return success ? this.sid : null;
  }

  async login(url: string, user: string, pass: string): Promise<boolean> {
    try {
      const cleanUrl = url.replace(/\/$/, '');
      const agent = new https.Agent({ rejectUnauthorized: false });
      
      const response = await axios.get(`${cleanUrl}/webapi/auth.cgi`, {
        httpsAgent: agent,
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

    const agent = new https.Agent({ rejectUnauthorized: false });
    const axiosConfig = { httpsAgent: agent };

    try {
      // Execute requests in parallel but handle errors individually to avoid total failure
      const [utilizationResult, storageResult, usbResult] = await Promise.allSettled([
        axios.get(`${this.baseUrl}/webapi/entry.cgi`, {
          ...axiosConfig,
          params: {
            api: 'SYNO.Core.System.Utilization',
            method: 'get',
            version: 1,
            _sid: sid
          }
        }),
        axios.get(`${this.baseUrl}/webapi/entry.cgi`, {
          ...axiosConfig,
          params: {
            api: 'SYNO.Storage.CGI.Storage',
            method: 'load_info',
            version: 1,
            _sid: sid
          }
        }),
        axios.get(`${this.baseUrl}/webapi/entry.cgi`, {
            ...axiosConfig,
            params: {
              api: 'SYNO.Core.ExternalDevice.Storage.USB',
              method: 'list',
              version: 1,
              _sid: sid
            }
        })
      ]);

      const utilization = utilizationResult.status === 'fulfilled' ? utilizationResult.value.data?.data : {};
      const storage = storageResult.status === 'fulfilled' ? storageResult.value.data?.data : {};
      const usb = usbResult.status === 'fulfilled' ? usbResult.value.data?.data : [];

      // Normalize CPU
      let cpuLoad = 0;
      if (utilization?.cpu) {
          // Standard Synology API: user_load, system_load, other_load (integers 0-100)
          const user = utilization.cpu.user_load || parseInt(utilization.cpu.user) || 0;
          const system = utilization.cpu.system_load || parseInt(utilization.cpu.system) || 0;
          cpuLoad = user + system;
      }

      // Normalize Network
      let netRx = 0;
      let netTx = 0;
      if (utilization?.network) {
          if (Array.isArray(utilization.network)) {
              utilization.network.forEach((iface: any) => {
                  netRx += parseInt(iface.rx || 0);
                  netTx += parseInt(iface.tx || 0);
              });
          } else {
              netRx = parseInt(utilization.network.rx || 0);
              netTx = parseInt(utilization.network.tx || 0);
          }
      }

      // Process volumes if available, otherwise disks
      const volumes = (storage?.volumes || []).map((v: any) => {
          // Normalize volume size data which can vary by DSM version
          let total = 0;
          let used = 0;

          if (v.size) {
              total = parseInt(v.size.total || 0);
              used = parseInt(v.size.used || 0);
          } else {
              total = parseInt(v.size_total || v.volume_total_size || v.total || 0);
              used = parseInt(v.size_used || v.volume_used_size || v.used || 0);
          }

          return {
              ...v,
              size_total: total,
              size_used: used
          };
      });
      const disks = storage?.disks || [];

      return {
        cpu: {
            load: cpuLoad,
            details: utilization?.cpu || {}
        },
        memory: utilization?.memory || { real_usage: 0, total_real: 0, avail_real: 0 },
        network: {
            rx: netRx,
            tx: netTx
        },
        storage: {
            disks: disks,
            volumes: volumes,
            usb: usb || []
        }
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
