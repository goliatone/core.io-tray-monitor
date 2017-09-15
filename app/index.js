'use strict';

const {ipcRenderer} = require('electron');

const Ractive = require('./vendors/ractive.min');

document.addEventListener('DOMContentLoaded', () => {
    console.info('DOMContentLoaded');

    const Instance = Ractive.extend({
        template: `
            <li class="sevice-{{item.online ? 'up' : 'down'}}">
                <a href="http://{{item.hostname}}:{{item.server.port}}">{{item.appId}}</a>
            </li>
        `,
        attributes: {
            required: [ 'item' ]
        }
    });

    let App = new Ractive({
        el: 'content',
        append: true,
        template: `
            <ul>
            {{#each instances}}
                <Instance item="{{this}}" />
            {{/each}}
            </ul>
        `,
        components: {
            Instance
        },
        data: function(){
            return {
                instances: {}
            };
        }
    });

    window.app = App;

    let btn = document.getElementById('send');
    let input = document.getElementById('mqtt');

    btn.addEventListener('click', (e) => {
        updateConfig({mqtt: input.value});
    });

    ipcRenderer.on('update', (type, event)=>{
        console.log('update', type, event);
        let record = event.record;
        App.set(`instances.${record.appId}`, record);
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
        console.log(txt);
        // let content = document.getElementById('content');
        // content.innerHTML += `<h3>${txt}</h3>`;
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
