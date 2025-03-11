import { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Paper, 
  Box,
  CircularProgress,
  Alert,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings';
import { getIpOptions, saveSettings, loadSettings, updateDnsRecords } from './services/api'
import { IpSelector } from './components/IpSelector'
import { DomainList } from './components/DomainList'
import { SettingsPanel } from './components/SettingsPanel'
import type { DnsRecord, IpOption } from './types'
import './styles/DnsStatus.css' // Import the DNS status styles

// Define the settings data structure
interface ZoneConfig {
  id: string;
  zoneId: string;
  rootDomain: string;
  prefixes: string[];
}

interface SettingsData {
  ipOptions: IpOption[];
  apiToken: string;
  zones: ZoneConfig[];
}

export function App() {
  // State management for data and loading/error states
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([])
  const [ipOptions, setIpOptions] = useState<IpOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIp, setSelectedIp] = useState<string | null>(() => {
    // Initialize from localStorage if available
    const savedIp = localStorage.getItem('selectedIp');
    return savedIp || null;
  })
  const [selectedDomains, setSelectedDomains] = useState<string[]>(() => {
    // Initialize from localStorage if available
    const savedDomains = localStorage.getItem('selectedDomains');
    return savedDomains ? JSON.parse(savedDomains) : [];
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<SettingsData>({
    ipOptions: [],
    apiToken: '',
    zones: [{ id: 'zone-1', zoneId: '', rootDomain: '', prefixes: [''] }]
  })

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Load saved settings first
        const savedSettings = await loadSettings();
        
        if (savedSettings) {
          // Use saved settings
          setSettings(savedSettings);
          setIpOptions(savedSettings.ipOptions);
          
          // Generate DNS records from zones
          const records = generateDnsRecordsFromZones(savedSettings.zones);
          setDnsRecords(records);
          
          // Validate saved selections
          validateSavedSelections(savedSettings.ipOptions, records);
        } else {
          // No saved settings, load defaults
          const options = await getIpOptions();
          setIpOptions(options);
          setDnsRecords([]);
          
          // Initialize settings with IP options
          setSettings(prev => ({
            ...prev,
            ipOptions: options
          }));
          
          // Validate saved selections with default options
          validateSavedSelections(options, []);
        }
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Validate saved selections against current data
  const validateSavedSelections = (ipOpts: IpOption[], records: DnsRecord[]) => {
    // Validate selected IP
    if (selectedIp) {
      const ipExists = ipOpts.some(opt => opt.address === selectedIp);
      if (!ipExists) {
        setSelectedIp(null);
        localStorage.removeItem('selectedIp');
      }
    }
    
    // Validate selected domains
    if (selectedDomains.length > 0) {
      const availableDomains = records.map(r => r.name);
      const validDomains = selectedDomains.filter(domain => 
        availableDomains.includes(domain)
      );
      
      if (validDomains.length !== selectedDomains.length) {
        setSelectedDomains(validDomains);
        if (validDomains.length > 0) {
          localStorage.setItem('selectedDomains', JSON.stringify(validDomains));
        } else {
          localStorage.removeItem('selectedDomains');
        }
      }
    }
  };

  // Generate DNS records from zones configuration
  // In the generateDnsRecordsFromZones function, remove the proxied property
  // Generate DNS records from zones configuration
  const generateDnsRecordsFromZones = (zones: ZoneConfig[]): DnsRecord[] => {
    const records: DnsRecord[] = [];
    
    zones.forEach(zone => {
      if (zone.rootDomain) {
        // Only add root domain if "@" is in the prefixes
        if (zone.prefixes.includes('@')) {
          records.push({
            id: `${zone.id}-root`,
            name: zone.rootDomain,
            type: 'A',
            content: '',
            zoneId: zone.zoneId
          });
        }
        
        // Add prefixed domains (excluding the "@" which represents the root domain)
        zone.prefixes.forEach((prefix, index) => {
          if (prefix && prefix !== '@') {
            records.push({
              id: `${zone.id}-${index}`,
              name: `${prefix}.${zone.rootDomain}`,
              type: 'A',
              content: '',
              zoneId: zone.zoneId
            });
          }
        });
      }
    });
    
    return records;
  };

  // Handle IP selection
  const handleIpSelect = (ip: string) => {
    setSelectedIp(ip)
  }

  // Handle domain selection
  const handleDomainSelect = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    )
  }

  const handleBatchSelect = (domains: string[]) => {
    setSelectedDomains(domains);
  };

  const [updateStatus, setUpdateStatus] = useState<{
    success: boolean;
    message: string;
    open: boolean;
  }>({
    success: false,
    message: '',
    open: false
  });

  // Add a new state for update operation loading
  const [updatingRecords, setUpdatingRecords] = useState(false);

  // In the handleUpdateRecords function, enhance the error handling:
  const handleUpdateRecords = async () => {
    if (!selectedIp || selectedDomains.length === 0) return;
    
    try {
      // Use the specific update loading state instead of the global one
      setUpdatingRecords(true);
      
      // Find the selected IP address object
      const selectedIpOption = ipOptions.find(option => option.address === selectedIp);
      if (!selectedIpOption) {
        throw new Error('Selected IP address not found');
      }
      
      // Send update request to the server
      const result = await updateDnsRecords(selectedDomains, selectedIp);
      
      // Calculate success and failure counts
      const successCount = result.results.filter((r: { success: boolean }) => r.success).length;
      const failCount = result.results.length - successCount;
      
      // Check for specific API token errors
      const hasTokenError = result.results.some(r => 
        !r.success && 
        (r.message?.includes('token') || 
         r.message?.includes('authorization') || 
         r.message?.includes('authenticate'))
      );
      
      // Show success message
      setUpdateStatus({
        success: result.success,
        message: failCount > 0
          ? `Updated ${successCount} out of ${result.results.length} DNS records. ${failCount} failed: ${
              hasTokenError 
                ? 'API token may be invalid or missing required permissions. Please check your settings.' 
                : result.error || 'Unknown error'
            }`
          : `Successfully updated all ${result.results.length} DNS records`,
        open: true
      });
      
      // If there's a token error, suggest opening settings
      if (hasTokenError) {
        setTimeout(() => {
          if (window.confirm('There seems to be an issue with your Cloudflare API token. Would you like to open settings to check it?')) {
            handleSettingsOpen();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating DNS records:', error);
      
      // Check if the error is related to the API token
      const errorMsg = error instanceof Error ? error.message : 'Failed to update DNS records';
      const isTokenError = errorMsg.toLowerCase().includes('token') || 
                           errorMsg.toLowerCase().includes('auth') ||
                           errorMsg.toLowerCase().includes('permission');
      
      setUpdateStatus({
        success: false,
        message: isTokenError 
          ? 'Authentication error: Please check your Cloudflare API token in settings'
          : errorMsg,
        open: true
      });
      
      // If it's a token error, suggest opening settings
      if (isTokenError) {
        setTimeout(() => {
          if (window.confirm('There seems to be an issue with your Cloudflare API token. Would you like to open settings to check it?')) {
            handleSettingsOpen();
          }
        }, 1000);
      }
    } finally {
      // Use the specific update loading state
      setUpdatingRecords(false);
    }
  };

  // Handle closing the snackbar
  const handleCloseSnackbar = () => {
    setUpdateStatus(prev => ({
      ...prev,
      open: false
    }));
  };

  // Handle settings panel
  const handleSettingsOpen = async () => {
    try {
      // Reload the latest settings from the server when opening the panel
      const latestSettings = await loadSettings();
      if (latestSettings) {
        setSettings(latestSettings);
      }
    } catch (error) {
      console.error('Error loading latest settings:', error);
    } finally {
      setSettingsOpen(true);
    }
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleSaveSettings = async (newSettings: SettingsData) => {
    try {
      setLoading(true);
      
      // Save settings to storage/file
      await saveSettings(newSettings);
      
      // Update local state
      setSettings(newSettings);
      setIpOptions(newSettings.ipOptions);
      
      // Generate DNS records from zones
      const records = generateDnsRecordsFromZones(newSettings.zones);
      setDnsRecords(records);
      
      console.log('Settings saved and app refreshed successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update localStorage when selectedIp changes
  useEffect(() => {
    if (selectedIp) {
      localStorage.setItem('selectedIp', selectedIp);
    } else {
      localStorage.removeItem('selectedIp');
    }
  }, [selectedIp]);

  // Update localStorage when selectedDomains changes
  useEffect(() => {
    if (selectedDomains.length > 0) {
      localStorage.setItem('selectedDomains', JSON.stringify(selectedDomains));
    } else {
      localStorage.removeItem('selectedDomains');
    }
  }, [selectedDomains]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1">
            Cloudflare DNS Batch Manager
          </Typography>
          <Tooltip title="Settings">
            <IconButton 
              onClick={handleSettingsOpen}
              color="primary"
              size="large"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Stack spacing={2}>
              <IpSelector 
                options={ipOptions}
                selectedIp={selectedIp}
                onSelectIp={handleIpSelect}
              />
              
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!selectedIp || selectedDomains.length === 0 || updatingRecords}
                  onClick={handleUpdateRecords}
                >
                  {updatingRecords ? (
                    <>
                      <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                      Updating...
                    </>
                  ) : (
                    'Update Records'
                  )}
                </Button>
              </Box>
              
              <DomainList
                records={dnsRecords}
                ipOptions={ipOptions}
                selectedIp={selectedIp}
                selectedDomains={selectedDomains}
                onDomainSelect={handleDomainSelect}
                onBatchSelect={handleBatchSelect}
                onUpdate={handleUpdateRecords}
                updating={updatingRecords}
                settings={settings} // Add the settings prop here
              />
            </Stack>
          </Paper>
        )}
      </Box>
      
      <SettingsPanel
        open={settingsOpen}
        onClose={handleSettingsClose}
        initialSettings={settings}
        onSave={handleSaveSettings}
      />
      
      {/* Add Snackbar for update status */}
      <Snackbar
        open={updateStatus.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={updateStatus.message}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={updateStatus.success ? "success" : "error"}
          sx={{ width: '100%' }}
        >
          {updateStatus.message}
        </Alert>
      </Snackbar>
      
      {/* Footer with version and GitHub link */}
      <Box sx={{ mt: 'auto', py: 2, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Cloudflare DNS Batch v0.1.0
        </Typography>
        <Box component="a" href="https://github.com/ganganray/cf-dns-batch" target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '4px' }}>
            <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
          GitHub
        </Box>
      </Box>
    </Container>
  )
}

export default App
