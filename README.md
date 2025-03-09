# README.md

# cf-dns-batch

cf-dns-batch is an open-source web application that allows users to manage Cloudflare DNS records for a predefined batch of domain names. The application provides a simple interface for selecting IP addresses and updating DNS records accordingly.

## Repository Status

- **Status**: Private Development
- **Version**: 0.1.0
- **Stage**: Initial Deployment

This project is initially for my personal usage, and I am not a programmer. I use intensively LLMs to help me build the project. I do not guarantee that I understand every code in this project, though I did try to ask the LLMs to explain every line of the code to me. Please use it at your own risk.

## Features

- View all DNS records across multiple domains
- Update multiple DNS records to a new IP address in one click
- Real-time DNS lookup to verify current record status
- Save and manage multiple IP addresses for quick switching
- Simple settings management for Cloudflare API tokens and zones

## Planned Features

- Support for Cloudflare proxied domains
  - Add mode switching between client-side DNS lookup and Cloudflare API
  - Retrieve accurate proxy status information from Cloudflare API
  - Display proxy status in the domain list

## Development

### Setup

1. Clone the repository
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

