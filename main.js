'use strict';

const path = require('path');
const pubsub = require('./lib/pubsub');

const {app, BrowserWindow, ipcMain, Tray, nativeImage} = require('electron');

let tray, window;

const assetsDir = path.join(__dirname, 'assets');

require('electron-reload')(path.join(__dirname, 'app'));

initialize(app);


function initialize(app){

    /*
     * This should be a randon ID first time,
     * create and load from config.
     */
    app.id = Date.now();

    /*
     * Don't show the app in the doc
     */
    app.dock.hide();

    //This should happen after user sets configuration
    //we should manage options, load from local store, etc
    ipcMain.on('ui:options', (e, options) => {
        console.log('ui:options', options);
        if(options.mqtt) {
            pubsub.init(app, options);

            app.pubsub.publish('ww/registry/list', {
                response: `ww/registry/${app.id}/list`
            });

            app.pubsub.subscribe(`ww/registry/${app.id}/list`, (t, e) => {
                console.log('Updated list of devices', t, e);
                app.window.webContents.send('update.list' , e);
            });
        }
    });

    // app.on('pubsub.ready', ()=>{
    //     pubsub.publish('ww/registry/list');
    // });

    /*
     * This event is triggered once Electron is ready
     * to run our code, it's effectively the main
     * method of our Electron app.
     */
    app.on('ready', () => {
        app.tray = createTray();
        app.window = createWindow();
    });

    ipcMain.on('show-window', (e, options={}) => {
        console.log('arguments', arguments.length);
        console.log(e, options);
        showWindow(options);
    });
}

function createTray(){
    tray = new Tray(path.join(assetsDir, 'IconTemplate.png'));

    tray.on('right-click', toggleWindow);
    tray.on('double-click', toggleWindow);

    tray.on('click', (event) =>{
        toggleWindow();

        /*
         * Show devtools when CTRL + CLICK
         */
        if(app.window.isVisible() && process.defaultApp && event.ctrlKey){
            app.window.openDevTools({
                mode: 'detach'
            });
        }
    });

    return tray;
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

    window.loadURL(`file://${path.join(__dirname, 'app', 'index.html')}`);

    /*
     * Hide window when it loses focus
     */
    window.on('blur', () => {
        if(window.webContents.isDevToolsOpened()) return;
        window.hide();
    });

    return window;
}

function showWindow(options={}) {
    const position = getWindowPosition();
    window.setPosition(position.x, position.y, false);
    if(options && options.size){
        window.setSize(options.size.w, options.size.h);
    }

    window.show();
    window.focus();
}

function getWindowPosition(){
    const windowBounds = window.getBounds();
    const trayBounds = tray.getBounds();

    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    const yoffset = 0;
    const y = Math.round(trayBounds.y + trayBounds.height + yoffset);

    return {x, y};
}

// tray.setToolTip(`${weather.currently.summary} at ${time}`)
// tray.setImage(path.join(assetsDirectory, 'moonTemplate.png'))
