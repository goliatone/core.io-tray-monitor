'use strict';

const {ipcRenderer} = require('electron');

document.addEventListener('DOMContentLoaded', () => {

    let btn = document.getElementById('send');
    let input = document.getElementById('mqtt');

    btn.addEventListener('click', (e) => {
        updateConfig({mqtt: input.value});
    });

    ipcRenderer.on('update', (type, event)=>{
        console.log('update', type, event);
        log(event.record.appId);
    });

    let config = getConfig();

    if(config){
        sendOptionsToMain(config);
    }

    if(config.mqtt){
        input.value = config.mqtt;
    }

    function updateConfig(config){
        log('Config: %s' + JSON.stringify(config));
        saveConfig(config);
        sendOptionsToMain(config);
    }

    function sendOptionsToMain(config){
        ipcRenderer.send('ui:options', config);
    }

    // let n = new Notification('You did it!', {
    //     body: 'Nice work.'
    // });

    /*
     * Tell the notification to show
     * the menubar popup window on click
     */
    // n.onclick = () => {
    //     ipcRenderer.send('show-window');
    // };

    function log(txt){
        let content = document.getElementById('content');
        content.innerHTML += `<h3>${txt}</h3>`;
    }

    log('Initialize!');
});

function getConfig() {
    let config = localStorage.getItem('_config');
    if(!config) return false;
    return JSON.parse(config);
}

function saveConfig(c={}) {
    localStorage.setItem('_config', JSON.stringify(c));
}
