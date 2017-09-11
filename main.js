'use strict';

const {app, BrowserWindow, ipcMain, Tray, nativeImage} = require('electron');
const path = require('path');

let tray, window;
const assetsDir = path.join(__dirname, 'assets');

/*
 * Don't show the app in the doc
 */
app.dock.hide();

/*
 * This event is triggered once Electron is ready
 * to run our code, it's effectively the main
 * method of our Electron app.
 */
app.on('ready', () => {
    createTray();
    createWindow();
});

ipcMain.on('show-window', () => {
    showWindow();
});

function createTray(){
    tray = new Tray(path.join(assetsDir, 'IconTemplate.png'));

    tray.on('right-click', toggleWindow);
    tray.on('double-click', toggleWindow);

    tray.on('click', (event) =>{
        toggleWindow();

        /*
         * Show devtools when CMD + CLICK
         */
        if(window.isVisible() && process.defaultApp && event.metaKey){
            window.openDevTools({
                model: 'detach'
            });
        }
    });
}

function toggleWindow(){

    if (window.isVisible()) {
        return window.hide();
    }

    showWindow();
}

function createWindow(){
    window = new BrowserWindow({
        width: 300,
        height: 450,
        show: false,
        frame: false,
        fullscreenable: false,
        resizable: false,
        webPreferences: {
            /*
             * Prevents renderer process code from
             * NOT running when window is hidden
             */
            backgroundThrottling: false
        }
    });

    window.loadURL(`file://${path.join(__dirname, 'index.html')}`);

    /*
     * Hide window when it loses focus
     */
    window.on('blur', () => {
        if(window.webContents.isDevToolsOpened()) return;
        window.hide();
    });
}

function showWindow() {
    const position = getWindowPosition();
    window.setPosition(position.x, position.y, false);
    window.show();
    window.focus();
}

function getWindowPosition(){
    const windowBounds = window.getBounds();
    const trayBounds = tray.getBounds();

    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    const y = Math.round(trayBounds.y + trayBounds.height + 4);

    return {x, y};
}

// tray.setToolTip(`${weather.currently.summary} at ${time}`)
// tray.setImage(path.join(assetsDirectory, 'moonTemplate.png'))
