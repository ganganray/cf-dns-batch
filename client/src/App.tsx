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
      
      // Show success message
      setUpdateStatus({
        success: result.success,
        message: result.success 
          ? `Successfully updated ${result.results.filter((r: { success: boolean }) => r.success).length} out of ${result.results.length} DNS records` 
          : `Failed to update some DNS records: ${result.message || 'Unknown error'}`,
        open: true
      });
      
      // Remove the following lines that clear selection after successful update
      // if (result.success) {
      //   setSelectedDomains([]);
      // }
    } catch (error) {
      console.error('Error updating DNS records:', error);
      setUpdateStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update DNS records',
        open: true
      });
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
    </Container>
  )
}

export default App
