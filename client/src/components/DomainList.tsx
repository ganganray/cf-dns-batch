import { useState, useEffect, useMemo } from 'react'
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Checkbox,
    Box,
    Chip,
    Stack,
    FormControlLabel,
    Button,
    ButtonGroup,
    Divider,
    Tooltip,
    CircularProgress,
    useMediaQuery,
    useTheme
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { DnsRecord, IpOption, DnsLookupResult } from '../types'
import { getDnsStatus, getDnsLookupStatus } from '../utils/ipUtils'
import { performCloudflareDoHLookup } from '../utils/dnsLookup'

// Remove the unused interface or use it in the code
// interface DomainGroup {
//     zone: string;
//     records: DnsRecord[];
// }

// Add settings to props
interface DomainListProps {
    records: DnsRecord[];
    ipOptions: IpOption[];
    selectedIp: string | null;
    selectedDomains: string[];
    onDomainSelect: (domain: string) => void;
    onBatchSelect: (domains: string[]) => void;
    onUpdate: () => void;
    updating?: boolean;
    settings: { zones: { rootDomain: string }[] }; // Add settings prop
}

export function DomainList({ 
    records, 
    ipOptions, 
    selectedIp,
    selectedDomains,
    onDomainSelect,
    onBatchSelect,
    onUpdate,
    updating = false,
    settings // Add settings parameter
}: DomainListProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [expanded, setExpanded] = useState(true);
    const [dnsLookups, setDnsLookups] = useState<Record<string, DnsLookupResult>>({});
    
    // Add state for expanded zones
    const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});

    // Group records by zone using useMemo for performance
    // Modified grouping logic to use rootDomains from settings
    const groupedRecords = useMemo(() => {
        // Create a map of all root domains from settings
        const rootDomains = settings.zones.map(zone => zone.rootDomain);
        
        // Initialize groups with all root domains (even empty ones)
        const groups: Record<string, DnsRecord[]> = {};
        rootDomains.forEach(domain => {
            groups[domain] = [];
        });
        
        // Add an "Other" group for domains that don't match any root domain
        groups["Other"] = [];
        
        // Assign each record to its appropriate group
        records.forEach(record => {
            // Find the matching root domain (if any)
            const matchingDomain = rootDomains.find(domain => 
                record.name === domain || record.name.endsWith(`.${domain}`)
            );
            
            if (matchingDomain) {
                groups[matchingDomain].push(record);
            } else {
                groups["Other"].push(record);
            }
        });
        
        // Remove empty groups and convert to array
        return Object.entries(groups)
            .filter(([_, records]) => records.length > 0)
            .map(([zone, records]) => ({ zone, records }))
            .sort((a, b) => a.zone.localeCompare(b.zone));
    }, [records, settings.zones]);
    
    // Initialize expanded state for all zones
    useEffect(() => {
        const initialExpandedState: Record<string, boolean> = {};
        groupedRecords.forEach(group => {
            initialExpandedState[group.zone] = true;
        });
        setExpandedZones(initialExpandedState);
    }, [groupedRecords.map(g => g.zone).join(',')]);

    const performDnsLookups = async (domains: string[]) => {
        try {
            const lookups = await Promise.all(
                domains.map(async (domain) => {
                    try {
                        const result = await performCloudflareDoHLookup(domain);
                        return [domain, result] as const;
                    } catch (error) {
                        console.error(`Error looking up DNS for ${domain}:`, error);
                        return [domain, {
                            success: false,
                            records: [],
                            timestamp: new Date().toISOString(),
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }] as const;
                    }
                })
            );
            setDnsLookups(Object.fromEntries(lookups));
        } catch (error) {
            console.error('Error performing DNS lookups:', error);
        }
    };

    useEffect(() => {
        performDnsLookups(records.map(r => r.name));
        const interval = setInterval(() => {
            performDnsLookups(records.map(r => r.name));
        }, 300000); // Refresh every 5 minutes
        
        return () => clearInterval(interval);
    }, [records.map(r => r.name).join(',')]); // Fix dependency array

    const handleSelectAll = () => {
        // This remains unchanged - selects all domains regardless of grouping
        onBatchSelect(records.map(r => r.name));
    };

    const handleSelectMismatched = () => {
        // Update to work with the grouped structure but maintain the same functionality
        const mismatched = records
            .filter(record => {
                // Get the DNS lookup result for this record
                const dnsLookup = dnsLookups[record.name];
                
                // Get the first DNS record value if available
                const dnsIp = dnsLookup?.success && dnsLookup.records.length > 0 
                    ? dnsLookup.records[0].value 
                    : undefined;
                
                // Use the DNS lookup result as content if record.content is empty
                const effectiveContent = record.content || dnsIp || '';
                
                // Get status based on the effective content
                const status = getDnsStatus(effectiveContent, selectedIp, ipOptions);
                
                // Only include records that don't match the selected IP
                return status.status !== 'matched';
            })
            .map(r => r.name);
        
        onBatchSelect(mismatched);
    };

    const handleClearSelection = () => {
        // This remains unchanged
        onBatchSelect([]);
    };

    // Add new state for refresh loading
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const handleRefreshDns = async () => {
        setIsRefreshing(true);
        await performDnsLookups(records.map(r => r.name));
        setIsRefreshing(false);
    };
    
    return (
        <Accordion
            expanded={expanded}
            onChange={() => setExpanded(!expanded)}
            sx={{ mt: 2 }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography>
                        Domains ({records.length}) - {selectedDomains.length} selected
                    </Typography>
                    <Box 
                        component="span" 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshDns();
                        }}
                        sx={{ 
                            ml: 2,
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': {
                                color: 'primary.dark',
                            }
                        }}
                    >
                        <Tooltip title="Refresh DNS Lookups">
                            {isRefreshing ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <RefreshIcon fontSize="small" />
                            )}
                        </Tooltip>
                    </Box>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={2}>
                    <ButtonGroup variant="outlined">
                        <Button onClick={handleSelectAll}>
                            Select All
                        </Button>
                        <Button 
                            onClick={handleSelectMismatched}
                            disabled={!selectedIp}
                        >
                            Select Mismatched
                        </Button>
                        <Button 
                            onClick={handleClearSelection}
                            disabled={selectedDomains.length === 0}
                        >
                            Clear Selection
                        </Button>
                    </ButtonGroup>
                    <Divider />
                    
                    {/* Replace the flat list with grouped accordions */}
                    <Stack spacing={2}>
                        {groupedRecords.map((group) => (
                            <Accordion 
                                key={group.zone}
                                expanded={expandedZones[group.zone] || false}
                                onChange={() => {
                                    setExpandedZones(prev => ({
                                        ...prev,
                                        [group.zone]: !prev[group.zone]
                                    }));
                                }}
                                disableGutters
                                sx={{ 
                                    boxShadow: 'none',
                                    '&:before': {
                                        display: 'none',
                                    },
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    mb: 1
                                }}
                            >
                                <AccordionSummary 
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{ 
                                        backgroundColor: 'background.paper',
                                        borderBottom: expandedZones[group.zone] ? '1px solid' : 'none',
                                        borderColor: 'divider'
                                    }}
                                >
                                    <Typography fontWeight="medium">
                                        {group.zone} ({group.records.length})
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 0 }}>
                                    <Stack spacing={0}>
                                        {group.records.map((record) => {
                                            const dnsLookup = dnsLookups[record.name];
                                            
                                            // Get the first DNS record value if available
                                            const dnsIp = dnsLookup?.success && dnsLookup.records.length > 0 
                                                ? dnsLookup.records[0].value 
                                                : undefined;
                                            
                                            // Use the DNS lookup result as content if record.content is empty
                                            const effectiveContent = record.content || dnsIp || '';
                                            
                                            // Get status based on the effective content
                                            const status = getDnsStatus(effectiveContent, selectedIp, ipOptions);
                                            
                                            // Get DNS status
                                            const dnsStatus = getDnsLookupStatus(dnsIp, selectedIp, ipOptions);
                    
                                            return (
                                                <Box
                                                    key={record.id}
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: isMobile ? 'column' : 'row',
                                                        alignItems: isMobile ? 'flex-start' : 'center',
                                                        py: 1,
                                                        px: isMobile ? 1 : 2,
                                                        borderBottom: '1px solid',
                                                        borderColor: 'divider',
                                                        '&:last-child': {
                                                            borderBottom: 'none'
                                                        }
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={selectedDomains.includes(record.name)}
                                                                onChange={() => onDomainSelect(record.name)}
                                                            />
                                                        }
                                                        label={
                                                            <Stack spacing={0.5}>
                                                                <Typography 
                                                                    sx={{ 
                                                                        maxWidth: isMobile ? '100%' : 200,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {/* Show only the subdomain part */}
                                                                    {record.name.endsWith(group.zone) && record.name !== group.zone
                                                                        ? record.name.slice(0, -group.zone.length - 1)
                                                                        : record.name
                                                                    }
                                                                </Typography>
                                                                {dnsLookup?.success && (
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        DNS: {dnsLookup.records.map((r, idx) => (
                                                                            <span key={idx}>{r.value}{idx < dnsLookup.records.length - 1 ? ', ' : ''}</span>
                                                                        ))}
                                                                    </Typography>
                                                                )}
                                                            </Stack>
                                                        }
                                                    />
                                                    <Stack 
                                                        direction="row" 
                                                        spacing={1} 
                                                        sx={{ 
                                                            ml: isMobile ? 0 : 'auto',
                                                            mt: isMobile ? 1 : 0,
                                                            width: isMobile ? '100%' : 'auto',
                                                            justifyContent: isMobile ? 'center' : 'flex-start'
                                                        }}
                                                    >
                                                        <Chip
                                                            label={status.description}
                                                            color={status.color}
                                                            size="small"
                                                            sx={{ 
                                                                flexGrow: 0,
                                                                '& .MuiChip-label': { 
                                                                    textAlign: 'center'
                                                                }
                                                            }}
                                                        />
                                                        <Chip
                                                            label={dnsStatus.description}
                                                            color={dnsStatus.color}
                                                            size="small"
                                                            sx={{ 
                                                                flexGrow: 0,
                                                                '& .MuiChip-label': { 
                                                                    textAlign: 'center'
                                                                }
                                                            }}
                                                        />
                                                    </Stack>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Stack>
                    
                    <Divider />
                    <Box display="flex" justifyContent="flex-end">
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={!selectedIp || selectedDomains.length === 0 || updating}
                            onClick={onUpdate}
                        >
                            {updating ? (
                                <>
                                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                                    Updating...
                                </>
                            ) : (
                                'Update Selected Domains'
                            )}
                        </Button>
                    </Box>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
}