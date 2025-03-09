import { useState, useEffect } from 'react'
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
    // Remove the unused import
    Tooltip,
    CircularProgress
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { DnsRecord, IpOption, DnsLookupResult } from '../types'
import { getDnsStatus, getDnsLookupStatus } from '../utils/ipUtils'
import { performCloudflareDoHLookup } from '../utils/dnsLookup'

interface DomainListProps {
    records: DnsRecord[];
    ipOptions: IpOption[];
    selectedIp: string | null;
    selectedDomains: string[];
    onDomainSelect: (domain: string) => void;
    onBatchSelect: (domains: string[]) => void;
    onUpdate: () => void;
    updating?: boolean; // Add this new optional prop
}

export function DomainList({ 
    records, 
    ipOptions, 
    selectedIp,
    selectedDomains,
    onDomainSelect,
    onBatchSelect,
    onUpdate,
    updating = false // Provide a default value
}: DomainListProps) {
    const [expanded, setExpanded] = useState(true);
    const [dnsLookups, setDnsLookups] = useState<Record<string, DnsLookupResult>>({});

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
        onBatchSelect(records.map(r => r.name));
    };

    const handleSelectMismatched = () => {
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
        onBatchSelect([]);
    };

    const handleRefreshDns = () => {
        performDnsLookups(records.map(r => r.name));
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
                            <RefreshIcon fontSize="small" />
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
                    <Stack spacing={1}>
                        {records.map((record) => {
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
                                        alignItems: 'center',
                                        py: 1,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider'
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
                                                <Typography>{record.name}</Typography>
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
                                    <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                                        <Chip
                                            label={status.description}
                                            color={status.color}
                                            size="small"
                                        />
                                        <Chip
                                            label={dnsStatus.description}
                                            color={dnsStatus.color}
                                            size="small"
                                        />
                                        {/* Removed proxied chip display */}
                                    </Stack>
                                </Box>
                            );
                        })}
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