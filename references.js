const config = require('./config.json');

const Store = require('electron-store');

const store = new Store();
module.exports = {
    codeflow: `https://id.twitch.tv/oauth2/authorize?client_id=${config.bot.id}&redirect_uri=http://localhost:${config.port}/callback&response_type=token&scope=chat:read&force_verify=true`,
    store: store,
}