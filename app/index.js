'use strict';

const {ipcRenderer, shell} = require('electron');

const Ractive = require('./vendors/ractive.min');

document.addEventListener('DOMContentLoaded', () => {
    console.info('DOMContentLoaded');

    const Instance = Ractive.extend({
        template: `
            <div on-click="showDetails" class="card service-{{item.online ? 'up' : 'down'}}">
                <div class="heading">
                    <a on-click="doOpen">
                        {{item.appId}}
                    </a>
                </div>
                <div class="uptime">
                    <span class="label">{{@this.getUptimeLabel()}} is now </span>
                    <span class="time">{{@this.getTime()}}</span>
                </div>
            </div>
        `,
        onrender: function(){
            window.page = this;
            this.on('doOpen', function(){
                console.log('click', this.get('item.health.url'));
                shell.openExternal(this.get('item.health.url'));
            });
            this.on('showDetails', function(){
                this.parent.set('activeInstance', this.get('item'));
            });
        },
        getUptimeLabel: function(){
            return this.get('online') ? 'Uptime' : 'Downtime';
        },
        getTime: function(){
            return '03min'
        },
        attributes: {
            required: [ 'item' ]
        }
    });


    let App = new Ractive({
        el: 'content',
        append: true,
        template: `
            <div id="home" class="active page">
            {{#each instances}}
                <Instance item="{{this}}" />
            {{/each}}
                <div class="toolbar">
                    <span on-click="showSettings" class="icon gear">
                        <img src="images/gear_icon.svg"/>
                    </span>
                </div>
            </div>
            <div id="details" class="page">
                <h2>{{activeInstance.appId}}</h2>
                <div class="line">
                    Hostname: {{activeInstance.hostname}}
                </div>
                <div class="line">
                    Uptime: {{@this.getUptime(activeInstance.appId)}}
                </div>
                <div class="line">
                    Health: {{activeInstance.health.url}}
                </div>
                <div class="line">
                    Environment: {{activeInstance.environment}}
                </div>
                <div class="line">
                    REPL: {{activeInstance.data.repl.port}}
                </div>
                <button on-click="back">Back</button>
            </div>
            <div id="settings" class="page">
                <h2>My Settings Page</h2>
                <div class="line">
                    <input id="mqtt" type="text" placeholder="mqtt://test.mosquitto.org"/>
                </div>
                <div class="line">
                <button id="send" on-click="send">Send</button>
                <button on-click="back">Back</button>
                </div>
            </div>
        `,
        components: {
            Instance
        },
        onrender: function(){
            this.observe('activeInstance', (n, o, k)=>{
                let home = this.find('#home').classList;
                home.remove('active');
                home.add('hidden');
                let details = this.find('#details').classList;
                details.add('active');
                details.remove('hidden');
            });
            this.on('back', ()=>{
                let details = this.find('.active').classList;
                details.add('hidden');
                details.remove('active');

                let home = this.find('#home').classList;
                home.remove('hidden');
                home.add('active');
            });

            this.on('showSettings', ()=>{
                let details = this.find('.active').classList;
                details.add('hidden');
                details.remove('active');

                let home = this.find('#settings').classList;
                home.remove('hidden');
                home.add('active');
            });
        },
        getUptime: function(id){
            return '2d 05h 32min';
        },
        data: function(){
            return {
                instances: {
                    "janus-hotdesk": {
                        "appId": "my-app",
                        "online": false,
                        "environment": "staging",
                        "hostname": "goliatodromo.local",
                        "data": {
                            "repl": {
                                "port": 8989
                            },
                            "server": {
                                "port": 7331
                            },
                            "pubsub": {
                                "url": "mqtt://localhost:7984"
                            }
                        },
                        "health": {
                            "url": "http://localhost:7331/health",
                            "interval": 50000
                        }
                    },
                    "janust-dashboard": {
                        "appId": "janust-dashboard",
                        online: true,
                        "environment": "development",
                        "hostname": "goliatodromo.local",
                        "data": {
                            "repl": {
                                "port": 8989
                            },
                            "server": {
                                "port": 7331
                            },
                            "pubsub": {
                                "url": "mqtt://localhost:7984"
                            }
                        },
                        "health": {
                            "url": "http://localhost:7331/health",
                            "interval": 50000
                        }
                    }
                }
            };
        }
    });

    window.app = App;

    let btn = document.getElementById('send');
    let input = document.getElementById('mqtt');

    btn.addEventListener('click', (e) => {
        updateConfig({
            mqtt: input.value
        });
    });

    ipcRenderer.on('update', (type, event)=>{
        console.log('update', type, event);
        let record = event.record;
        App.set(`instances.${record.appId}`, record);
        sendNotice(record);
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

    function sendNotice(record) {
        let note = new Notification('Instance status change!', {
            body: `${record.appId} is now ${record.online ? 'online' : 'offline'}`
        });

        /*
         * Tell the notification to show
         * the menubar popup window on click
         */
        note.onclick = () => {
            ipcRenderer.send('show-window', {
                size: {
                    w: 300,
                    h: 230
                }
            });
        };
    }



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
