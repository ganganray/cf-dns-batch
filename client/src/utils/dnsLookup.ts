export interface DnsLookupResult {
  success: boolean;
  records: {
    value: string;
    ttl: number;
  }[];
  timestamp: string;
  error?: string;
  message?: string; // Add optional message property
}

export async function performCloudflareDoHLookup(domain: string): Promise<DnsLookupResult> {
  try {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
      headers: {
        'Accept': 'application/dns-json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`DNS lookup failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.Status !== 0) {
      return {
        success: false,
        records: [],
        timestamp: new Date().toISOString(),
        error: `DNS error code: ${data.Status}`
      };
    }
    
    if (!data.Answer || data.Answer.length === 0) {
      return {
        success: true,
        records: [],
        timestamp: new Date().toISOString(),
        message: 'No DNS records found'
      };
    }
    
    return {
      success: true,
      records: data.Answer.map((record: any) => ({
        type: record.type,
        value: record.data
      })),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('DNS lookup error:', error);
    return {
      success: false,
      records: [],
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown DNS lookup error'
    };
  }
}