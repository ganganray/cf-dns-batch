export interface DnsLookupResult {
  success: boolean;
  records: {
    value: string;
    ttl: number;
  }[];
  timestamp: string;
  error?: string;
}

export async function performCloudflareDoHLookup(domain: string): Promise<DnsLookupResult> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      {
        headers: {
          'Accept': 'application/dns-json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`DNS lookup failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      records: data.Answer ? data.Answer.map((record: any) => ({
        value: record.data,
        ttl: record.TTL
      })) : [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      records: [],
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}