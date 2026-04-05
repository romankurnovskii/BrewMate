# BrewMate

**BrewMate - Homebrew GUI**

BrewMate is a macOS GUI application that makes it easy to search for, install, and uninstall Homebrew casks. You can also see the top downloaded casks.

Includes third party apps + from [awesome-brew](https://github.com/romankurnovskii/homebrew-awesome-brew/)

![BrewMate Screenshot 1](assets/mainwindow.png)

## Features

- [x] install/uninstall casks
- [x] brew update/upgrade
- [x] list local installed
- [x] top installs
- [x] show logs on install/uninstall
- [ ] add 3rd party taps
- [ ] handle apps required sudo/pass on install/uninstall

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **macOS**: This package is designed to work on macOS. Ensure you are using a compatible version.
- **Homebrew**: This package requires [Homebrew](https://brew.sh/) to be installed on your system. Homebrew is a package manager for macOS that simplifies the installation of software. If you don't have Homebrew installed, you can install it by running the following command in your terminal:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

# Install

### Option 1

1. Download the latest DMG file from the [releases page](https://github.com/romankurnovskii/BrewMate/releases).
2. Double-click the DMG file to open it.
3. Drag the BrewMate app to your Applications folder.

### Option 2

In terminal:

```sh
brew install romankurnovskii/awesome-brew/brewmate --cask --no-quarantine
```

### Option 3

In terminal:

```sh
brew tap romankurnovskii/awesome-brew
brew update
brew install --cask --no-quarantine brewmate
```

## First time launch

1. Navigate to your "Applications" folder.
1. Find the app `BrewMate` and right-click on it.
1. Select "Open" from the context menu.
1. When the security warning appears, click "Open" to confirm that you want to open the app.
1. The app will now launch.

# Requirements

- macOS 10.15 or later.

# Development / Build

1. Clone the repository: `git clone https://github.com/romankurnovskii/BrewMate.git`
2. Install dependencies: `npm install`
3. Build the app: `npm run build`
4. For **development** run `npm start` or `npm run start:dev`

## Build Types

BrewMate supports two build types:

### Local Test Build

Build a version you can run and test on your Mac:

```bash
npm run build:mac
```

This creates a DMG in `dist-app/mac/` that you can install and run locally.

### Mac App Store Build

Build a version for App Store submission:

```bash
npm run build:mas
```

This creates a PKG in `dist-app/mas-universal/` for App Store submission.

⚠️ **Important**: MAS builds **cannot be run locally** - they're only for App Store submission. If you need to test the app, use `build:mac` instead.

## Testing & Validation Workflow

Before submitting to the App Store:

1. **Test locally** (on your ARM Mac):

   ```bash
   npm run build:mac
   npm run test:local
   ```

2. **Build for App Store**:

   ```bash
   npm run build:mas
   ```

3. **Pre-submission validation**:

   ```bash
   npm run pre-submit
   ```

   This checks architecture, code signing, entitlements, and common rejection reasons.

4. **Upload to App Store Connect** via Transporter app

See [docs/BUILD_TYPES.md](docs/BUILD_TYPES.md) and [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) for more details.

## Available Scripts in addition to the existing ones

### `npm run electron:dev`

Runs the app in the development mode.

The app will reload if you make edits in the `electron` directory.<br>
You will also see any lint errors in the console.

### `npm run electron:build`

Builds the app package for production to the `dist` folder.

Your app is ready to be distributed!

# License

BrewMate is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
