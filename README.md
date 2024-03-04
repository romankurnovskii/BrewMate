# BrewMate

**BrewMate - Homebrew GUI**

BrewMate is a macOS GUI application that makes it easy to search for, install, and uninstall Homebrew casks. You can also see the top downloaded casks.

Includes third party apps + from [awesome-brew](https://github.com/romankurnovskii/homebrew-awesome-brew/)

## Features

- [x] install/uninstall casks
- [x] brew update/upgrade
- [x] list local installed
- [x] top installs
- [x] show logs on install/uninstall
- [ ] add 3rd party taps
- [ ] handle apps required sudo/pass on install/uninstall

# Install

1. Download the latest DMG file from the [releases page](https://github.com/romankurnovskii/BrewMate/releases).
2. Double-click the DMG file to open it.
3. Drag the BrewMate app to your Applications folder.

or

```
brew install romankurnovskii/awesome-brew/brewmate --cask --no-quarantine
```

or
```
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

# Screenshots

![BrewMate Screenshot 1](assets/mainwindow.gif)


# Requirements

macOS 10.15 or later.

# Build

1. Clone the repository: `git clone https://github.com/romankurnovskii/BrewMate.git`
2. Install dependencies: `npm install`
3. Build the app: `npm run electron:build`
4. The built app will be located in the `dist` folder.
5. For development run `electron:dev`


## Available Scripts in addition to the existing ones

### `npm run electron:dev`

Runs the app in the development mode.

The app will reload if you make edits in the `electron` directory.<br>
You will also see any lint errors in the console.

### `npm run electron:build`

Builds the app package for production to the `dist` folder.

Your app is ready to be distributed!

# Project directory structure

```bash
brewmate/
├── package.json
│
## render process
├── tsconfig.json
├── public/
├── src/
│
## main process
├── electron
|  ├── api.ts
|  ├── cli.ts
|  ├── constants.ts
|  ├── helpers
|  |  └── casks.ts
|  ├── helpers.ts
|  ├── log.ts
|  ├── main.ts
|  ├── menu.ts
|  ├── preload.ts
|  ├── tsconfig.json
|  └── types
|     └── index.d.ts
## build output
├── build/
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   │
│   └── electron/
│      └── main.js
│
## distribution packages
└── dist/
    ├── mac/
        └── BrewMate.app

```

# License

BrewMate is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
