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

# Generate Caddyfile based on environment variables
echo "Generating Caddyfile..."

if [ "$USE_HTTPS" = "true" ]; then
  # HTTPS configuration
  cat > /etc/caddy/Caddyfile << EOL
{
  # Global options
  admin off
}

$DOMAIN {
  root * /app/client
  file_server

  handle /api/* {
    reverse_proxy localhost:$PORT
  }

  try_files {path} /index.html
}
EOL
else
  # HTTP only configuration
  cat > /etc/caddy/Caddyfile << EOL
{
  # Global options
  admin off
  auto_https off
  http_port 80
  https_port 443
}

:80 {
  root * /app/client
  file_server

  handle /api/* {
    reverse_proxy localhost:$PORT
  }

  try_files {path} /index.html
}
EOL
fi

echo "Starting Node.js server..."
cd /app/server
node index.js &

echo "Starting Caddy server..."
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile

# Keep container running
wait