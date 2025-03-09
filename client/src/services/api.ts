import type { IpOption, SettingsData } from '../types'

// Get IP options from server settings
export const getIpOptions = async (): Promise<IpOption[]> => {
  try {
    const settings = await loadSettings();
    if (settings && settings.ipOptions && settings.ipOptions.length > 0) {
      return settings.ipOptions;
    }
    return [];
  } catch (error) {
    console.error('Error fetching IP options:', error);
    return [];
  }
};

// Save settings to server
export const saveSettings = async (settings: SettingsData): Promise<void> => {
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save settings to server');
    }
    
    console.log('Settings saved successfully to server');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

// Load settings from server
export const loadSettings = async (): Promise<SettingsData | null> => {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      throw new Error('Failed to load settings from server');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
};

// Get settings file path (for development purposes)
export const getSettingsFilePath = async (): Promise<string> => {
  try {
    const response = await fetch('/api/settings/path');
    if (!response.ok) {
      throw new Error('Failed to get settings file path');
    }
    
    const data = await response.json();
    return data.path;
  } catch (error) {
    console.error('Error getting settings file path:', error);
    throw error;
  }
};

// Add this function to your existing api.ts file
export async function updateDnsRecords(domains: string[], ipAddress: string): Promise<any> {
  try {
    const response = await fetch('/api/update-dns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domains, ipAddress }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update DNS records');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating DNS records:', error);
    throw error;
  }
}