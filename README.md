# Electron + React + TypeScript Template

A clean, production-ready template for building cross-platform desktop applications with Electron, React 18, TypeScript, and Vite.

## Features

- **Electron**: Build cross-platform desktop apps with JavaScript, HTML, and CSS
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development with better tooling
- **Vite**: Next-generation frontend tooling with instant HMR
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Electron Builder**: Package and distribute your app for Windows, macOS, and Linux

## Project Structure

```
├── electron-main/     # Electron main process files
│   ├── main.js       # Main process entry point
│   ├── preload.js    # Preload script for secure IPC
│   └── tsconfig.json # TypeScript config for main process
├── scripts/          # Build scripts
│   └── copy-electron-files.js
├── public/           # Static assets
├── src/              # React application source
│   ├── App.tsx       # Main application component
│   ├── index.html    # HTML entry point
│   ├── index.tsx     # React entry point
│   └── index.css     # Global styles
├── package.json      # Project dependencies and scripts
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone or download this template
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server with hot reload:

```bash
npm run dev
```

This will start:
- Vite dev server on http://localhost:3000
- Electron app with live reload

### Building for Production

Build the React app and Electron package:

```bash
npm run electron:build
```

This creates production-ready files in the `dist/` and `dist-electron/` directories.

### Platform-Specific Builds

Build for specific platforms:

```bash
# Windows
npm run electron:build-win

# macOS
npm run electron:build-mac

# Linux
npm run electron:build-linux
```

## Available Scripts

- `npm run dev` - Start Vite dev server only
- `npm run build` - Build React app for production
- `npm run preview` - Preview production build
- `npm run electron:dev` - Start Electron with dev server
- `npm run electron:build` - Build both React app and Electron
- `npm run build:electron` - Build only Electron main process

## Configuration

### Electron Main Process

Edit `electron-main/main.js` to customize the main process behavior.

### Preload Script

Edit `electron-main/preload.js` to expose secure APIs to the renderer process.

### Build Configuration

Edit `package.json` `build` section to customize:
- App ID and product name
- Platform-specific settings
- Installer options

## Adding Your Application

1. Replace `App.tsx` with your own React components
2. Update `index.html` with your app's metadata
3. Add your application logic and styles
4. Configure any necessary environment variables

## Security Best Practices

- Use preload scripts for secure IPC communication
- Validate all user input
- Keep dependencies updated
- Follow Electron security guidelines

## License

This template is provided as-is. Feel free to modify and use for your projects.

## Support

For issues and questions, please check the Electron and React documentation.
