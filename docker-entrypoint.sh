#!/bin/sh

# Create example settings.json if it doesn't exist
if [ ! -f "/etc/cf-dns-batch/settings.json" ]; then
  echo "Creating example settings.json..."
  cat > /etc/cf-dns-batch/settings.json << EOL
{
  "ipOptions": [
    {
      "id": "example1",
      "name": "Example IP 1",
      "address": "192.168.1.1",
      "description": "Example local IP address"
    },
    {
      "id": "example2",
      "name": "Example IP 2",
      "address": "203.0.113.1",
      "description": "Example public IP address"
    }
  ],
  "apiToken": "",
  "zones": [
    {
      "id": "example-zone",
      "rootDomain": "example.com",
      "zoneId": "",
      "prefixes": ["www", "api", "mail"]
    }
  ]
}
EOL
fi

echo "Starting Node.js server..."
cd /app/server
exec node dist/index.js

echo "Starting Caddy server..."
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile

# Keep container running
wait