# Cloudflare DNS Batch (cf-dns-batch)

Cloudflare DNS Batch is an open-source web application that allows users to manage Cloudflare DNS records for a predefined batch of domain names. The application provides a simple interface for selecting IP addresses and updating DNS records accordingly.

This project was initially for my personal convenience. I am no programmer. This project is developed by extensively using LLMs to generate codes. I don't know anything about TypeScript or React before starting this project. I have not read every line of the code; however, I did have the LLMs explain most of functional part to me. Therefore, I cannot guarantee the safety of this application. I am not responsible for any damage caused by this project. Use at your own risk.

## Screenshots

![Main Interface](./screenshots/main-interface.jpg) ![Settings Panel](./screenshots/settings-panel.jpg)

## Features

### DNS Management
- Batch update multiple DNS records simultaneously
- Real-time DNS lookup verification for current record status (from the the client's perspective)
- Support for multiple domain zones and subdomains (under one Cloudflare account)
- Automatic validation of DNS record updates

### IP Address Management
- Save and manage multiple IP addresses with descriptions
- Quick IP address switching for DNS updates
- IP address validation and format checking
- Persistent storage of frequently used IP addresses

### User Interface
- Clean and intuitive web interface
- Real-time status updates and notifications
- Batch selection tools for multiple domains
- Dark/Light theme support (planned)

### Configuration & Security
- Secure Cloudflare API token management
- Simple zone and domain configuration
- Test connection feature for API token validation
- Settings backup and restore functionality (planned)

### Deployment
- Docker support for easy deployment
- Volume mounting for persistent settings
- Cross-platform compatibility (uncertain)
- Minimal resource requirements (unknown)


## Getting Started

### Prerequisites

- Docker (for deployment)
- Cloudflare account with API token

### Docker Deployment

#### Command line

```bash
docker run -d \
  --name cf-dns-batch \
  -p 10080:80 \
  -v cf_dns_batch:/etc/cf-dns-batch \
  --restart unless-stopped \
  ganganray/cf-dns-batch:0.1.0
```
#### Docker Compose (recommended)

```bash
mkdir cf-dns-batch
cd cf-dns-batch
```
Create and edite `docker-compose.yml`, paste the following content:

```yaml
services:
  cf-dns-batch:
    image: ganganray/cf-dns-batch:0.1.0
    container_name: cf-dns-batch
    ports:
      - "10080:80"
    volumes:
      - cf-dns-batch:/etc/cf-dns-batch
    restart: unless-stopped

volumes:
  cf-dns-batch:
```

Then run:

```bash
docker-compose up -d
```

Access the application at [http://DOCKER_HOST:10080](http://DOCKER_HOST:10080).

## How to use

IMPORTANT! If you plan to expose the application to the internet, ensure it is behind a reverse proxy that handles TLS/SSL certificates and an authentication provider such as Authentik.

### Settings
The application stores settings in a 'settings.json' file, which includes:

- IP address options (currently supports IPv4 only)
- Cloudflare API token
  - You must create a Cloudflare API token for the DNS zones you wish to manage
  - The API Token validation Test Connection button only returns the correct answer immediately after entering the API Token. Upon page refresh, a masked (fake) token is loaded for security reasons. The API calls are sent directly from the server using the right token, so that is fine.
  
- Zone configurations
  - Find your Zone ID by visiting your zone overview page and using Ctrl + F for "Zone ID".  
  - '@' as a prefix denotes the root domain.
  
## Planned Features
- Support for Cloudflare proxied domains
  - Mode switching between client-side DNS lookup and Cloudflare API
  - Retrieve accurate proxy status information from Cloudflare API
- IPv6 support
- Dark/Light theme
- Settings backup and restore
- Other domain name providers support

## License

Cloudflare DNS Batch is released under the MIT License.

## Dependencies and Acknowledgments

This project relies on several open-source libraries and tools:

### Frontend
- React - UI library
- Material-UI - Component library
- Axios - HTTP client
- TypeScript - Programming language

### Backend
- Node.js - JavaScript runtime
- Express - Web framework
- TypeScript - Programming language

### Development and Deployment
- Docker - Containerization
- Vite - Build tool and development server

Cloudflare® is a registered trademark of Cloudflare, Inc. This project is not affiliated with, endorsed by, or sponsored by Cloudflare.