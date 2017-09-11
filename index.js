'use strict';

const {ipcRenderer} = require('electron');

document.addEventListener('DOMContentLoaded', () => {

    let n = new Notification('You did it!', {
        body: 'Nice work.'
    });

    /*
     * Tell the notification to show
     * the menubar popup window on click
     */
    n.onclick = () => {
        ipcRenderer.send('show-window');
    };
});
