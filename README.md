# Triboar Guildhall

A Hugo-based static site for the Triboar Guildhall Westmarches D&D community.

## Prerequisites

- Docker
- Docker Compose
- Git

No local Node.js or Hugo installation required - all dependencies run in Docker containers.

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/adamhstewart/triboar-site.git
cd triboar
```

### 2. Start the Development Server

Run the development server with hot-reloading for both Hugo and Tailwind CSS:

```bash
./serve.sh
```

This script will:
- Build the Docker image if needed
- Start a Tailwind CSS watcher in the background
- Start the Hugo development server
- Make the site available at http://localhost:1313

Press `Ctrl+C` to stop both servers and clean up containers.

### 3. Make Changes

Edit files in:
- `content/` - Markdown content files
- `layouts/` - HTML templates
- `assets/css/style.css` - Tailwind source CSS
- `static/` - Static assets
- `tailwind.config.js` - Tailwind configuration

Both Hugo and Tailwind will automatically rebuild when you save changes.

## Project Structure

```
.
├── archetypes/       # Content templates
├── assets/           # Source CSS files
├── content/          # Markdown content files
├── data/             # Data files
├── i18n/             # Internationalization
├── layouts/          # Hugo templates
├── static/           # Static assets (images, compiled CSS, etc.)
├── themes/           # Hugo themes
├── hugo.toml         # Hugo configuration
├── tailwind.config.js # Tailwind CSS configuration
└── docker-compose.yml # Docker setup
```

## Deployment

Deploy to GitHub Pages:

```bash
./deploy.sh
```

This script will:
- Verify you're on a clean working directory
- Build Tailwind CSS for production (minified)
- Generate the Hugo site with minification
- Push the built site to the `gh-pages` branch
- Deploy to https://adamhstewart.github.io/triboar-site/

**Note:** The deploy script should typically be run from the `main` branch.

## Docker Commands

If you need to run Hugo or Docker commands manually:

### Build the Docker image
```bash
docker-compose build
```

### Run Hugo commands
```bash
docker-compose run --rm hugo hugo <command>
```

### Build Tailwind CSS manually
```bash
docker-compose run --rm hugo sh -c "export NPM_CONFIG_CACHE=/tmp/.npm && cd /tmp && npm install tailwindcss@3.4.0 && cd /src && /tmp/node_modules/.bin/tailwindcss -i ./assets/css/style.css -o ./static/css/output.css --config ./tailwind.config.js --minify"
```

## Customization

### Theme Colors

The site uses custom color palette defined in `tailwind.config.js`:

- `guild-brown` - Primary brown tones
- `guild-beige` - Beige/parchment tones
- `guild-gold` - Gold accent
- `guild-blue` - Blue tones

### Site Configuration

Update site settings in `hugo.toml`:
- `baseURL` - Site URL
- `title` - Site title
- Other Hugo configuration options

## Troubleshooting

### Port 1313 already in use

If you see an error about port 1313, stop any running Hugo servers:

```bash
docker-compose down
docker stop tailwind-watcher
docker rm tailwind-watcher
```

### CSS not updating

If Tailwind CSS changes aren't being picked up, restart the development server.

### Permission issues

The Docker container runs as user `hugo` (UID 1000). If you encounter permission issues, check that your files are accessible to this user.

## License

[Add your license information here]
