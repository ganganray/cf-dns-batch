import React from 'react';
import { useDnsLookup } from '../hooks/useDnsLookup';

interface DnsStatusProps {
  domain: string;
  expectedIp: string;
}

export const DnsStatus: React.FC<DnsStatusProps> = ({ domain, expectedIp }) => {
  const { dnsLookup, isLoading, refresh } = useDnsLookup(domain);

  const isDnsMatched = dnsLookup?.success && 
    dnsLookup.records.some(record => record.value === expectedIp);

  return (
    <div className="dns-status">
      {isLoading ? (
        <span className="loading">Checking DNS...</span>
      ) : dnsLookup?.success ? (
        <div className="dns-info">
          <div className="dns-records">
            {dnsLookup.records.map((record, index) => (
              <span key={index} className="dns-ip">
                {record.value}
              </span>
            ))}
          </div>
          <span className={`dns-match-status ${isDnsMatched ? 'matched' : 'mismatched'}`}>
            {isDnsMatched ? '✓ Matched' : '✗ Mismatched'}
          </span>
          <span className="dns-timestamp">
            Last checked: {new Date(dnsLookup.timestamp).toLocaleTimeString()}
          </span>
          <button onClick={refresh} className="refresh-dns">
            Refresh
          </button>
        </div>
      ) : (
        <span className="dns-error">
          {dnsLookup?.error || 'DNS lookup failed'}
        </span>
      )}
    </div>
  );
};