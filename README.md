# Steam Download Master

Steam Download Master is a powerful desktop application for downloading, managing, and compressing Steam games to save disk space. Built with modern technologies, it provides a sleek and intuitive interface for gamers who want to optimize their game storage.

![Steam Download Master](./client/public/screenshot.png)

## Features

- **Game Downloads**: Easily download Steam games with login support including Steam Guard authentication
- **Download Queue Management**: Control the number of concurrent downloads, pause, resume, and prioritize downloads
- **Compression System**: Save disk space by compressing games when not in use
- **Game Library Management**: Organize your downloaded games with filters, search, and sorting options
- **Dashboard**: Get insights about your game library, space usage, and active downloads
- **System Integration**: Start with Windows, minimize to tray, and more

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Electron, Node.js
- **State Management**: React Context API
- **Routing**: Wouter
- **Game Compression**: Custom compression algorithms optimized for game files

## Installation

### Requirements

- Windows 10 or higher (macOS and Linux coming soon)
- Steam account (required for downloading games)
- At least 2GB of RAM
- 100MB of free disk space for the application (plus space for games)

### Download

1. Go to the [Releases](https://github.com/yourusername/steam-download-master/releases) page
2. Download the latest version for your operating system
3. Run the installer and follow the instructions

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/steam-download-master.git
   cd steam-download-master
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

## Building

To build the application for production:

```
npm run build
# or
yarn build
```

The output will be in the `dist` directory.

## Contributing

Contributions are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and suggest features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Steam](https://store.steampowered.com/) for providing the platform
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) for the command-line interface
- All contributors and supporters of the project

## Disclaimer

This application is not affiliated with, maintained, authorized, endorsed, or sponsored by Valve Corporation or any of its affiliates. This is an independent project created by fans for fans. 