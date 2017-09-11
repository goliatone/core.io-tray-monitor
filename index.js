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

    ipcRenderer.on('update', (type, event)=>{
        console.log('update', type, event);
        log(event.record.appId);
    });

    function log(txt){
        let content = document.getElementById('content');
        content.innerHTML += `<h3>${txt}</h3>`;
    }

    log('Initialize!');
});
