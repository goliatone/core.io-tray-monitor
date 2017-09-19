'use strict';
const mqtt = require('core.io-pubsub-mqtt');

module.exports.init = function(context, config) {

    context.getLogger = function(){
        return console;
    };

    if(config.mqtt){
        config.url = config.mqtt;
    }

    context.pubsub = mqtt.init(context, config);

    context.pubsub.once('ready', (pubsub) => {
        console.log('pubsub.ready');
        context.emit('pubsub.ready', pubsub);
    });

    context.pubsub.subscribe('ww/registry/application/update', (topic, event) => {
        console.log('Handle topic', topic);
        console.log('send: ', typeof context.window.webContents.send);

        context.window.webContents.send('update', event);

        console.log('----');
    });
};
