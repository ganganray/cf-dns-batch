import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import { SettingsData, DnsUpdateRequest, DnsUpdateResponse } from './types';

const app = express();
const PORT = process.env.PORT || 3001;

// Simplify path handling - use Linux-style paths for production
const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/etc/cf-dns-batch'
  : path.join(__dirname, '../data');

const SETTINGS_FILE_PATH = path.join(DATA_DIR, 'settings.json');

// Update static file serving to be environment-aware with better Docker compatibility
const CLIENT_DIST = process.env.NODE_ENV === 'production'
  ? process.env.CLIENT_PATH || path.join(__dirname, '../../client/dist') // Allow override via env var
  : path.join(__dirname, '../../client/dist'); // Same path for development

// Ensure data directory exists with proper error handling
try {
  fs.ensureDirSync(DATA_DIR);
  console.log(`Data directory ensured at: ${DATA_DIR}`);
} catch (error) {
  console.error(`Failed to create data directory at ${DATA_DIR}:`, error);
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Update static file serving
app.use(express.static(CLIENT_DIST));

/**
 * Mask the API token for security
 * @param token The original API token
 * @returns A masked version of the token
 */
function maskApiToken(token: string): string {
  if (!token) return '';
  
  // If token is very short (test token), return a fake one
  if (token.length <= 4) {
    return 'test_' + Math.random().toString(36).substring(2, 10);
  }
  
  // Keep first 2 and last 2 characters, replace the rest with random chars
  const firstTwo = token.substring(0, 2);
  const lastTwo = token.substring(token.length - 2);
  const middleLength = token.length - 4;
  
  // Generate random middle part
  let maskedMiddle = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < middleLength; i++) {
    maskedMiddle += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return firstTwo + maskedMiddle + lastTwo;
}

// API endpoints
app.get('/api/settings', async (req, res) => {
  try {
    if (await fs.pathExists(SETTINGS_FILE_PATH)) {
      const settings = await fs.readJson(SETTINGS_FILE_PATH) as SettingsData;
      
      // Mask the API token before sending to frontend
      const maskedSettings: SettingsData = {
        ...settings,
        apiToken: maskApiToken(settings.apiToken)
      };
      
      res.json(maskedSettings);
    } else {
      // Return default settings if file doesn't exist
      const defaultSettings: SettingsData = {
        ipOptions: [],
        apiToken: '',
        zones: []
      };
      res.json(defaultSettings);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const incomingSettings: SettingsData = req.body;
    
    // Check if we already have settings with an API token
    let existingApiToken = '';
    if (await fs.pathExists(SETTINGS_FILE_PATH)) {
      const existingSettings = await fs.readJson(SETTINGS_FILE_PATH) as SettingsData;
      existingApiToken = existingSettings.apiToken || '';
    }
    
    // If the incoming token matches our masked pattern (first 2 + random + last 2),
    // it means the user didn't change it, so keep the original
    const newApiToken = incomingSettings.apiToken;
    let finalApiToken = newApiToken;
    
    if (existingApiToken && 
        newApiToken.length === existingApiToken.length &&
        newApiToken.substring(0, 2) === existingApiToken.substring(0, 2) &&
        newApiToken.substring(newApiToken.length - 2) === existingApiToken.substring(existingApiToken.length - 2)) {
      // Token appears to be our masked version, keep the original
      finalApiToken = existingApiToken;
    }
    
    // Save the settings with the correct API token
    const settingsToSave: SettingsData = {
      ...incomingSettings,
      apiToken: finalApiToken
    };
    
    await fs.writeJson(SETTINGS_FILE_PATH, settingsToSave, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Get settings file path (for development purposes)
app.get('/api/settings/path', (req, res) => {
  try {
    res.json({ path: SETTINGS_FILE_PATH });
  } catch (error) {
    console.error('Error getting settings file path:', error);
    res.status(500).json({ error: 'Failed to get settings file path' });
  }
});

/**
 * Update DNS records in Cloudflare
 */
app.post('/api/update-dns', async (req, res) => {
  try {
    const updateRequest: DnsUpdateRequest = req.body;
    const { domains, ipAddress } = updateRequest;
    
    if (!domains || domains.length === 0 || !ipAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: domains and ipAddress' 
      });
    }
    
    // Load settings to get API token and zone information
    if (!await fs.pathExists(SETTINGS_FILE_PATH)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Settings not found. Please configure your settings first.' 
      });
    }
    
    const settings = await fs.readJson(SETTINGS_FILE_PATH) as SettingsData;
    
    if (!settings.apiToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cloudflare API token not found in settings' 
      });
    }
    
    // Create a map of domain to zone ID
    const domainToZoneMap = new Map<string, string>();
    
    settings.zones.forEach(zone => {
      if (zone.rootDomain && zone.zoneId) {
        // Map root domain
        domainToZoneMap.set(zone.rootDomain, zone.zoneId);
        
        // Map all prefixed domains
        zone.prefixes.forEach(prefix => {
          if (prefix && prefix !== '@') {
            domainToZoneMap.set(`${prefix}.${zone.rootDomain}`, zone.zoneId);
          }
        });
      }
    });
    
    // Process each domain
    const results: DnsUpdateResponse = {
      success: true,
      results: []
    };
    
    for (const domain of domains) {
      const zoneId = domainToZoneMap.get(domain);
      
      if (!zoneId) {
        results.results.push({
          domain,
          success: false,
          message: 'Domain not found in configured zones'
        });
        continue;
      }
      
      try {
        // First, check if the record exists
        const recordName = domain.includes('.') ? domain.split('.')[0] : '@';
        const zoneName = domain.includes('.') ? domain.substring(domain.indexOf('.') + 1) : domain;
        
        // List DNS records to find the one we want to update
        const listResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=A&name=${domain}`,
          {
            headers: {
              'Authorization': `Bearer ${settings.apiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const listData = await listResponse.json() as any;
        
        if (!listResponse.ok) {
          results.results.push({
            domain,
            success: false,
            message: `Failed to list DNS records: ${listData.errors?.[0]?.message || 'Unknown error'}`
          });
          continue;
        }
        
        if (listData.result.length === 0) {
          // Record doesn't exist, create it
          const createResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${settings.apiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: 'A',
                name: recordName,
                content: ipAddress,
                ttl: 1, // Auto TTL
                proxied: false
              })
            }
          );
          
          const createData = await createResponse.json() as any;
          
          if (!createResponse.ok) {
            results.results.push({
              domain,
              success: false,
              message: `Failed to create DNS record: ${createData.errors?.[0]?.message || 'Unknown error'}`
            });
          } else {
            results.results.push({
              domain,
              success: true,
              message: 'DNS record created successfully',
              recordId: createData.result.id
            });
          }
        } else {
          // Record exists, update it
          const recordId = listData.result[0].id;
          
          const updateResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${settings.apiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: ipAddress
              })
            }
          );
          
          const updateData = await updateResponse.json() as any;
          
          if (!updateResponse.ok) {
            results.results.push({
              domain,
              success: false,
              message: `Failed to update DNS record: ${updateData.errors?.[0]?.message || 'Unknown error'}`
            });
          } else {
            results.results.push({
              domain,
              success: true,
              message: 'DNS record updated successfully',
              recordId: updateData.result.id
            });
          }
        }
      } catch (error) {
        console.error(`Error updating DNS record for ${domain}:`, error);
        results.results.push({
          domain,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Set overall success based on individual results
    results.success = results.results.every(result => result.success);
    
    res.json(results);
  } catch (error) {
    console.error('Error updating DNS records:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// For all other GET requests, return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// Start server with enhanced logging
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Server port: ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Client files: ${CLIENT_DIST}`);
});