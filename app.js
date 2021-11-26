const {BrowserWindow, app, ipcMain} = require('electron');
const path = require('path')
const expressApp = require('express')();
const store = require('./references').store;
const config = require('./config.json');
const console = require("console");
const axios = require('axios')
expressApp.set('view engine', 'ejs');
const references = require('./references')
const process = require("process");
const tmi = require("tmi.js");
let win;
let client;
const createWindow = () => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        autoHideMenuBar: true,
        title: "Twitch chat highlight",
    })

    win.once('ready-to-show', () => {
        win.show();
    });

    win.loadFile(path.join(__dirname, 'src/views/index.html'))
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})


module.store = store;

ipcMain.on('getUser', (event, args) => {
    const user = store.get('user');
    if (!user) {
        event.returnValue = null;
    }
})

expressApp.get('/callback', async (req, res) => {
    if (req.query.content) {
        const hash = Object.fromEntries(decodeURIComponent(req.query.content).split('&').map((v) => v.split('=')));

        console.log(hash.access_token)

        store.set('access_token', hash.access_token);

        userData = await axios({
            url: 'https://api.twitch.tv/helix/users',
            method: 'GET',
            headers: {
                'Client-Id': config.bot.id,
                'Authorization': 'Bearer ' + await store.get('access_token'),
            },
        }).then((response) => response.data.data[0]).catch((er) => er);

        if (userData instanceof Error) {
            store.clear();
            app.relaunch({args: process.argv.slice(1).concat(['--relaunch'])});
            return app.exit(0);
        }

        store.set('user', userData);

        res.status(200).end();

        app.relaunch();
        app.exit()

    } else {
        res.render(path.join(__dirname, 'src/views/other/callback.ejs'), {
            port: config.port
        });
    }
})

ipcMain.on('loginUser', async (e, args) => {
    if (!client) {

        await loginClient()
        client.on('message', (channel, tags, message, self) => {
            if (self) return;

            console.log('???')

            const highlight = store.get('highlight');

            if (highlight) {
                if (highlight.includes(message.toLowerCase())) {
                    win.webContents.send('message', {
                        message: message,
                        channel: channel,
                        tags: tags,
                        self: self
                    })
                }
            } else {
                win.webContents.send('message', {
                    message: message,
                    channel: channel,
                    tags: tags,
                    self: self
                })
            }

        })
    }
})

async function loginClient() {
    client = new tmi.Client({
        options: {debug: true},
        identity: {
            username: store.get('user').login,
            password: 'oauth:' + store.get('access_token')
        },
        channels: [store.get('user').login]
    });

    await client.connect();
}

expressApp.listen(config.port)