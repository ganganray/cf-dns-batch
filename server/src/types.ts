/**
 * Interface for IP address options
 */
export interface IpOption {
  id: string;
  address: string;
  description: string;
}

/**
 * Interface for zone configuration
 */
export interface ZoneConfig {
  id: string;
  zoneId: string;
  rootDomain: string;
  prefixes: string[];
}

/**
 * Interface for application settings data
 */
export interface SettingsData {
  ipOptions: IpOption[];
  apiToken: string;
  zones: ZoneConfig[];
}

/**
 * Interface for DNS update request
 */
export interface DnsUpdateRequest {
  domains: string[];
  ipAddress: string;
}

/**
 * Interface for individual DNS update result
 */
export interface DnsUpdateResult {
  domain: string;
  success: boolean;
  message: string;
  recordId?: string;
}

/**
 * Interface for DNS update response
 */
// Update the DnsUpdateResponse interface to include the error property
export interface DnsUpdateResponse {
  success: boolean;
  results: {
    domain: string;
    success: boolean;
    message: string;
    recordId?: string;
  }[];
  error?: string; // Add this property
}