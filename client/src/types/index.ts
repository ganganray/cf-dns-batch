export interface DnsRecord {
    id: string;
    name: string;
    type: string;
    content: string;
    // Removed proxied property as it's not needed for client-side DNS lookups
    ttl?: number;
    lastCheck?: string;
    zoneId?: string;
    dnsLookup?: DnsLookupResult;
}

export interface IpOption {
    id: string;
    address: string;
    description: string;
}

export interface DomainStatus {
    matched: boolean;
    currentIp: string;
    description: string;
    lastCheck: string;
}

export interface DnsLookupResult {
  success: boolean;
  records: {
    value: string;
    ttl: number;
  }[];
  timestamp: string;
  error?: string;
}

export interface ZoneConfig {
  id: string;
  zoneId: string;
  rootDomain: string;
  prefixes: string[];
}

export interface SettingsData {
  ipOptions: IpOption[];
  apiToken: string;
  zones: ZoneConfig[];
}