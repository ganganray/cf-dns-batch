import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  List,
  ListItem,
  Divider,
  Paper,
  Stack,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { IpOption } from '../types';

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

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  initialSettings: SettingsData;
  onSave: (settings: SettingsData) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onClose,
  initialSettings,
  onSave
}) => {
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [showToken, setShowToken] = useState(false);
  const [isTokenFocused, setIsTokenFocused] = useState(false);
  const [displayedToken, setDisplayedToken] = useState('');
  const [isTokenEdited, setIsTokenEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Add validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update settings when initialSettings prop changes or when drawer opens
  useEffect(() => {
    if (open) {
      setSettings(initialSettings);
      setIsTokenEdited(false);
      setDisplayedToken('');
      setValidationErrors({});
    }
  }, [initialSettings, open]);

  // Add IPv4 validation function
  const isValidIPv4 = (ip: string): boolean => {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  // Handle IP options changes with validation
  const handleAddIpOption = () => {
    setSettings(prev => ({
      ...prev,
      ipOptions: [
        ...prev.ipOptions,
        { id: `ip-${Date.now()}`, address: '', description: '' }
      ]
    }));
  };

  const handleRemoveIpOption = (id: string) => {
    setSettings(prev => ({
      ...prev,
      ipOptions: prev.ipOptions.filter(option => option.id !== id)
    }));
    
    // Remove any validation errors for this option
    setValidationErrors(prev => {
      const newErrors = {...prev};
      delete newErrors[`ip-${id}`];
      return newErrors;
    });
  };

  const handleIpOptionChange = (id: string, field: 'address' | 'description', value: string) => {
    setSettings(prev => ({
      ...prev,
      ipOptions: prev.ipOptions.map(option => 
        option.id === id ? { ...option, [field]: value } : option
      )
    }));
    
    // Validate IP address
    if (field === 'address') {
      if (value && !isValidIPv4(value)) {
        setValidationErrors(prev => ({
          ...prev,
          [`ip-${id}`]: 'Please enter a valid IPv4 address'
        }));
      } else {
        setValidationErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[`ip-${id}`];
          return newErrors;
        });
      }
    }
  };
  // Handle API token changes
  const handleApiTokenChange = (value: string) => {
    setIsTokenEdited(true);
    setDisplayedToken(value);
    setSettings(prev => ({
      ...prev,
      apiToken: value
    }));
  };
  // Handle token focus
  const handleTokenFocus = () => {
    setIsTokenFocused(true);
    setDisplayedToken('');
    setIsTokenEdited(false);
  };
  // Handle token blur
  const handleTokenBlur = () => {
    setIsTokenFocused(false);
    if (!isTokenEdited) {
      // If no edits were made, restore the original token value
      setDisplayedToken('');
    }
  };
  // Mask API token for display
  const maskToken = (token: string) => {
    if (!token) return '';
    if (token.length <= 2) return token;
    if (token.length <= 4) return token.substring(0, 1) + '*'.repeat(token.length - 2) + token.substring(token.length - 1);
    return `${token.substring(0, 2)}${'*'.repeat(token.length - 4)}${token.substring(token.length - 2)}`;
  };
  // Handle zone configuration changes
  const handleAddZone = () => {
    setSettings(prev => ({
      ...prev,
      zones: [
        ...prev.zones,
        { id: `zone-${Date.now()}`, zoneId: '', rootDomain: '', prefixes: [''] }
      ]
    }));
  };

  const handleRemoveZone = (id: string) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.filter(zone => zone.id !== id)
    }));
  };

  // Add domain validation function with wide compatibility
  const isValidDomain = (domain: string): boolean => {
    if (!domain) return false;
    
    // Allow domain names with letters, numbers, hyphens, dots
    // Each label (part between dots) must start and end with letter/number
    // TLD must be at least 2 characters
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$/;
    
    // Additional checks for overall length
    if (domain.length > 253) return false;
    
    return domainRegex.test(domain);
  };

  const handleZoneChange = (id: string, field: 'zoneId' | 'rootDomain', value: string) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.map(zone => 
        zone.id === id ? { ...zone, [field]: value } : zone
      )
    }));
    
    // Validate root domain
    if (field === 'rootDomain') {
      if (value && !isValidDomain(value)) {
        setValidationErrors(prev => ({
          ...prev,
          [`domain-${id}`]: 'Please enter a valid domain name'
        }));
      } else {
        setValidationErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[`domain-${id}`];
          return newErrors;
        });
      }
    }
  };

  const handleAddPrefix = (zoneId: string) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.map(zone => 
        zone.id === zoneId 
          ? { ...zone, prefixes: [...zone.prefixes, ''] } 
          : zone
      )
    }));
  };

  const handleRemovePrefix = (zoneId: string, index: number) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.map(zone => 
        zone.id === zoneId 
          ? { ...zone, prefixes: zone.prefixes.filter((_, i) => i !== index) } 
          : zone
      )
    }));
  };

  const handlePrefixChange = (zoneId: string, index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.map(zone => 
        zone.id === zoneId 
          ? { 
              ...zone, 
              prefixes: zone.prefixes.map((prefix, i) => 
                i === index ? value : prefix
              ) 
            } 
          : zone
      )
    }));
  };

  const handleSave = async () => {
    // Validate all fields before saving
    const errors: Record<string, string> = {};
    
    // Validate IP addresses
    settings.ipOptions.forEach(option => {
      if (option.address && !isValidIPv4(option.address)) {
        errors[`ip-${option.id}`] = 'Please enter a valid IPv4 address';
      }
    });
    
    // Validate root domains
    settings.zones.forEach(zone => {
      if (zone.rootDomain && !isValidDomain(zone.rootDomain)) {
        errors[`domain-${zone.id}`] = 'Please enter a valid domain name';
      }
    });
    
    // Check if we have any validation errors
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '400px',
          padding: 3,
          boxSizing: 'border-box'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Settings</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {/* IP Options Section */}
        <Typography variant="h6" sx={{ mb: 2 }}>IP Addresses</Typography>
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <List>
            {settings.ipOptions.map((option) => (
              <ListItem key={option.id} sx={{ px: 0 }}>
                <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                  <TextField
                    label="IP Address"
                    value={option.address}
                    onChange={(e) => handleIpOptionChange(option.id, 'address', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    error={!!validationErrors[`ip-${option.id}`]}
                    helperText={validationErrors[`ip-${option.id}`] || ''}
                  />
                  <TextField
                    label="Description"
                    value={option.description}
                    onChange={(e) => handleIpOptionChange(option.id, 'description', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <IconButton 
                    color="error" 
                    onClick={() => handleRemoveIpOption(option.id)}
                    disabled={settings.ipOptions.length <= 1}
                  >
                    <RemoveIcon />
                  </IconButton>
                </Stack>
              </ListItem>
            ))}
          </List>
          <Button 
            startIcon={<AddIcon />} 
            onClick={handleAddIpOption}
            sx={{ mt: 1 }}
          >
            Add IP Address
          </Button>
        </Paper>

        {/* API Token Section */}
        <Typography variant="h6" sx={{ mb: 2 }}>Cloudflare API Token</Typography>
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="API Token"
            type={showToken ? 'text' : 'password'}
            value={isTokenFocused ? displayedToken : ''}
            onChange={(e) => handleApiTokenChange(e.target.value)}
            onFocus={handleTokenFocus}
            onBlur={handleTokenBlur}
            placeholder={isTokenFocused ? 'Enter new token or leave empty to keep current' : 'Enter API token'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowToken(!showToken)}>
                    {showToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            helperText="Token will be masked for security"
            sx={{ mb: 1 }}
          />
          {!isTokenFocused && settings.apiToken && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Masked token: {maskToken(settings.apiToken)}
            </Typography>
          )}
        </Paper>

        {/* Zones Section */}
        <Typography variant="h6" sx={{ mb: 2 }}>Domain Zones</Typography>
        {settings.zones.map((zone, zoneIndex) => (
          <Paper key={zone.id} elevation={1} sx={{ p: 2, mb: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">Zone {zoneIndex + 1}</Typography>
                <IconButton 
                  color="error" 
                  onClick={() => handleRemoveZone(zone.id)}
                  disabled={settings.zones.length <= 1}
                >
                  <RemoveIcon />
                </IconButton>
              </Box>
              
              <TextField
                label="Zone ID"
                value={zone.zoneId}
                onChange={(e) => handleZoneChange(zone.id, 'zoneId', e.target.value)}
                fullWidth
                size="small"
              />
              
              <TextField
                label="Root Domain"
                value={zone.rootDomain}
                onChange={(e) => handleZoneChange(zone.id, 'rootDomain', e.target.value)}
                fullWidth
                size="small"
                error={!!validationErrors[`domain-${zone.id}`]}
                helperText={validationErrors[`domain-${zone.id}`] || ''}
              />
              
              <Typography variant="subtitle2">Domain Prefixes</Typography>
              
              <List>
                {zone.prefixes.map((prefix, prefixIndex) => (
                  <ListItem key={prefixIndex} sx={{ px: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                      <TextField
                        label={`Prefix ${prefixIndex + 1}`}
                        value={prefix}
                        onChange={(e) => handlePrefixChange(zone.id, prefixIndex, e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <IconButton 
                        color="error" 
                        onClick={() => handleRemovePrefix(zone.id, prefixIndex)}
                        disabled={zone.prefixes.length <= 1}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </Stack>
                  </ListItem>
                ))}
              </List>
              
              <Button 
                startIcon={<AddIcon />} 
                onClick={() => handleAddPrefix(zone.id)}
              >
                Add Prefix
              </Button>
            </Stack>
          </Paper>
        ))}
        
        <Button 
          startIcon={<AddIcon />} 
          onClick={handleAddZone}
          sx={{ mb: 3 }}
        >
          Add Zone
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Drawer>
  );
};