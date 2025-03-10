# README.md

# cf-dns-batch

cf-dns-batch is an open-source web application that allows users to manage Cloudflare DNS records for a predefined batch of domain names. The application provides a simple interface for selecting IP addresses and updating DNS records accordingly.

## Features

- View all DNS records across multiple domains
- Update multiple DNS records to a new IP address in one click
- Real-time DNS lookup to verify current record status
- Save and manage multiple IP addresses for quick switching
- Simple settings management for Cloudflare API tokens and zones
- Docker support for easy deployment

## Getting Started

### Prerequisites

- Docker (for deployment)
- Cloudflare account with API token

### Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/ganganray/cf-dns-batch.git
   cd cf-dns-batch
   ```
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`

### Building

Run `npm run build` to create a production build.

### Deployment

1. Build the project with `npm run build`
2. The build output will be in the `dist` directory
3. Deploy the contents of the `dist` directory to your web server or hosting service
4. For local usage, you can serve the build using a simple HTTP server:
   - Install serve: `npm install -g serve`
   - Run: `serve -s dist`

## License

MIT

