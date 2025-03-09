import type { IpOption } from '../types';

interface StatusResult {
  status: 'matched' | 'alternative' | 'unknown';
  color: 'success' | 'warning' | 'error';
  description: string;
}

export function getDnsStatus(
  currentIp: string,
  selectedIp: string | null,
  ipOptions: IpOption[]
): StatusResult {
  // Find if the current IP is in our known IP options
  const ipOption = ipOptions.find(option => option.address === currentIp);
  
  if (!ipOption) {
    return {
      status: 'unknown',
      color: 'error',
      description: 'Unknown Network'
    };
  }
  
  // If no IP is selected, just show the network name
  if (!selectedIp) {
    return {
      status: 'alternative',
      color: 'warning',
      description: ipOption.description
    };
  }
  
  // Check if current IP matches selected IP
  if (currentIp === selectedIp) {
    return {
      status: 'matched',
      color: 'success',
      description: ipOption.description
    };
  }
  
  // Current IP is different from selected IP
  return {
    status: 'alternative',
    color: 'warning',
    description: ipOption.description
  };
}

export function getDnsLookupStatus(
  dnsIp: string | undefined,
  selectedIp: string | null,
  ipOptions: IpOption[]
): StatusResult {
  if (!dnsIp) {
    return {
      status: 'unknown',
      color: 'error',
      description: 'DNS Lookup Failed'
    };
  }
  
  // If no IP is selected, just show the network name if available
  if (!selectedIp) {
    const ipOption = ipOptions.find(option => option.address === dnsIp);
    return {
      status: 'alternative',
      color: 'warning',
      description: ipOption ? ipOption.description : 'Unknown Network'
    };
  }
  
  // Check if DNS IP matches selected IP
  if (dnsIp === selectedIp) {
    return {
      status: 'matched',
      color: 'success',
      description: 'DNS Matched'
    };
  }
  
  // DNS IP is different from selected IP - always show as mismatch
  // regardless of whether it's in our known networks
  return {
    status: 'alternative',
    color: 'warning',
    description: 'DNS Mismatch'
  };
}