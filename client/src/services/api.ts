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
// Update DNS records with improved error handling and per-zone status reporting
export async function updateDnsRecords(domains: string[], ipAddress: string): Promise<{
  success: boolean;
  results: {
    domain: string;
    success: boolean;
    message: string;
    zoneId?: string;
  }[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/update-dns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domains, ipAddress }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the response contains results for each domain
    if (data.results && Array.isArray(data.results)) {
      return {
        success: data.results.every((result: any) => result.success),
        results: data.results
      };
    }
    
    // If the response doesn't have the expected format, return a generic success
    return {
      success: true,
      results: domains.map(domain => ({
        domain,
        success: true,
        message: 'DNS record updated successfully'
      }))
    };
  } catch (error) {
    console.error('Error updating DNS records:', error);
    return { 
      success: false, 
      results: domains.map(domain => ({
        domain,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })),
      error: error instanceof Error ? error.message : 'Failed to update DNS records'
    };
  }
}

// Test Cloudflare API token validity
export const testCloudflareToken = async (token: string): Promise<{ valid: boolean; message: string }> => {
  try {
    const response = await fetch('/api/test-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { 
        valid: false, 
        message: data.error || 'Failed to validate token' 
      };
    }
    
    return { 
      valid: true, 
      message: 'Token is valid and has the required permissions' 
    };
  } catch (error) {
    console.error('Error testing Cloudflare token:', error);
    return { 
      valid: false, 
      message: error instanceof Error ? error.message : 'Network error while validating token' 
    };
  }
};