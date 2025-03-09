import { useState, useEffect } from 'react';
import { performCloudflareDoHLookup, DnsLookupResult } from '../utils/dnsLookup';

export function useDnsLookup(domain: string, refreshInterval = 300000) {
  const [dnsLookup, setDnsLookup] = useState<DnsLookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkDns = async () => {
    setIsLoading(true);
    const result = await performCloudflareDoHLookup(domain);
    setDnsLookup(result);
    setIsLoading(false);
  };

  useEffect(() => {
    checkDns();
    const interval = setInterval(checkDns, refreshInterval);
    return () => clearInterval(interval);
  }, [domain, refreshInterval]);

  return { dnsLookup, isLoading, refresh: checkDns };
}