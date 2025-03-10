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
  admin off
}

$DOMAIN {
  # Handle API requests first
  handle /api/* {
    reverse_proxy localhost:$PORT
  }
  
  # Then serve static files
  root * /app/client
  file_server
  try_files {path} /index.html
}
EOL
else
  # HTTP only configuration
  cat > /etc/caddy/Caddyfile << EOL
{
  admin off
  auto_https off
  http_port 80
  https_port 443
}

:80 {
  # Handle API requests first
  handle /api/* {
    reverse_proxy localhost:$PORT
  }
  
  # Then serve static files
  root * /app/client
  file_server
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