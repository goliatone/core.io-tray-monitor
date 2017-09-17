'use strict';
const path = require('path');
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
                    <span class="label">{{serviceLabel}} is now </span>
                    <span class="time">{{serviceTime}}</span>
                </div>
            </div>
        `,
        computed: {
            serviceLabel: function(){
                return this.get('online') ? 'Uptime' : 'Downtime';
            }
        },
        onrender: function(){
            window.page = this;

            this.parent.on('time.update', ()=>{
                this.updateServiceTime();
            });

            this.updateServiceTime();

            this.on('doOpen', function(){
                console.log('click', this.get('item.health.url'));
                shell.openExternal(this.get('item.health.url'));
            });
            this.on('showDetails', function(){
                this.parent.set('activeInstance', this.get('item'));
            });
        },
        updateServiceTime: function(){
            let time = this.getTime();
            this.set('serviceTime', time);
        },
        getUptimeLabel: function(){
            return this.get('online') ? 'Uptime' : 'Downtime';
        },
        getTime: function(){
            let time = Date.now() - new Date(this.get('item.updatedAt'));
            return format(time/1000);
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
                    Server: {{activeInstance.data.server.port}}
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
            setInterval(()=>{
                this.fire('time.update');
            }, 1000);

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
            let time = Date.now() - new Date(this.get(`instances.${id}.updatedAt`));
            return format(time/1000);
        },
        data: function(){
            return {
                instances: {
                    // "janus-hotdesk": {
                    //     "appId": "my-app",
                    //     "online": false,
                    //     "environment": "staging",
                    //     "hostname": "goliatodromo.local",
                    //     "data": {
                    //         "repl": {
                    //             "port": 8989
                    //         },
                    //         "server": {
                    //             "port": 7331
                    //         },
                    //         "pubsub": {
                    //             "url": "mqtt://localhost:7984"
                    //         }
                    //     },
                    //     "health": {
                    //         "url": "http://localhost:7331/health",
                    //         "interval": 50000
                    //     }
                    // },
                    // "janust-dashboard": {
                    //     "appId": "janust-dashboard",
                    //     online: true,
                    //     "environment": "development",
                    //     "hostname": "goliatodromo.local",
                    //     "data": {
                    //         "repl": {
                    //             "port": 8989
                    //         },
                    //         "server": {
                    //             "port": 7331
                    //         },
                    //         "pubsub": {
                    //             "url": "mqtt://localhost:7984"
                    //         }
                    //     },
                    //     "health": {
                    //         "url": "http://localhost:7331/health",
                    //         "interval": 50000
                    //     }
                    // }
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

    ipcRenderer.on('update.list', (_, event)=>{
        console.log('update', _, event);
        if(event.result){
            event.result.forEach((record)=>{
                App.set(`instances.${record.appId}`, record);
            });
        }
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
        let status = record.online ? 'online' : 'offline';
        let note = new Notification(`${record.appId} is now ${status}`, {
            body: 'Instance status change!',
            // icon: path.join(__dirname, 'images', `${status}.png`)
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

function format(seconds){
    function pad(s){
        return (s < 10 ? '0' : '') + s;
    }
    var hour = Math.floor(seconds / (60*60));
    var min = Math.floor(seconds % (60*60) / 60);
    var sec = Math.floor(seconds % 60);

    return pad(hour) + ':' + pad(min) + ':' + pad(sec);
}
