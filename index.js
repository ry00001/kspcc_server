/**
 * -- Kerbal Space Program: Crowd Control --
 * 
 * - Component: Main Server
 * 
 * (C) Rin 2020
 * 
 * Kerbal Space Program is property of Squad and Take-Two Interactive, 2011-2020.
 * I am not affiliated with the developers of Kerbal Space Program.
 */

const BASE_PORT = 4326;

const express = require('express');
const ws = require('ws');
const util = require('util');
const winston = require('winston');
const colors = require('colors');

const levels = {
    crit: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    silly: 5
}

const displayLevels = {
    crit: '!CRITICAL!'.bgBrightRed,
    error: 'ERROR'.brightRed,
    warn: 'Warning'.brightYellow,
    info: 'Info'.brightCyan,
    debug: 'Debug'.cyan,
    silly: '???'.brightMagenta
}

const logger = winston.createLogger({
    level: 'silly',
    levels: levels,
    format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.errors({stack: true}),
        winston.format.splat(),
        winston.format.printf((info) => {
            return `${colors.gray(info.timestamp)} | [${displayLevels[info.level]}] ${colors.brightWhite(info.message)}`
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

logger.info('Creating servers');

var ksps = [];

const broadcastToKSP = (data) => {
    for (let i of ksps) {
        i.send(JSON.stringify(data));
    }
};

const app = new express();
const server = require('http').createServer(app);

const io = require('socket.io')(server);

const wsServer = new ws.Server({
    port: BASE_PORT+1
});

logger.info(`Interface on ${BASE_PORT}, connection to KSP on ${BASE_PORT+1}`)

app.use(express.static('static'));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    return res.render('index.html');
})

server.listen(BASE_PORT, () => {
    logger.info('We have liftoff!')
});

io.on('connection', (socket) => {
    logger.debug('Connection from interface received!');
    socket.on('disconnect', () => {
        logger.debug('Disconnected.')
    })

    socket.on('effect', (data) => {
        logger.info(`Requested effect ${data.effect}, transmitting info to Kerbal Space Program...`);
        broadcastToKSP({type: 'effect', effect: data.effect});
    })
})

// KSP-side

wsServer.on('connection', (socket) => {
    logger.info('Received new connection from Kerbal Space Program client!');
    ksps.push(socket);
    socket.on('close', () => {
        logger.info('KSP has disconnected, removing from list.');
        ksps.splice(ksps.indexOf(socket), 1);
    });

    socket.on('message', (_msg) => {
        let msg = JSON.parse(_msg);
        if (msg.type === 'power') {
            io.emit('power', msg.power)
        } else if (msg.type === 'hello') {
            logger.info('Kerbal Space Program says hello!!');
        }
    })
});