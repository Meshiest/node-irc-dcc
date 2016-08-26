// stdlib
const net = require('net');
const path = require('path');
const fs = require('fs');

// third party
const ip = require('ip');
const format = require('string-format');

// sibling
const myip = require('./myip');
const Chat = require('./chat');

const send_template = "DCC SEND {filename} {addr} {port} {length}";
const chat_template = "DCC CHAT chat {addr} {port}";

function patch() {
    var irc = require('irc');
    irc.Client.prototype.sendFile = function() {
        sendFile.apply(null, [this].concat(Array.prototype.slice.call(arguments)))
    }
}

function sendFile(client, to, filename, callback) {
    myip(client.opt.localAddress, (addr) => {
        if (!client.opt.localAddress) {
            var localAddress = '0.0.0.0';
        } else {
            var localAddress = client.opt.localAddress
        }
        var basename = path.basename(filename);
        var fullpath = path.resolve(filename);
        var filestat = fs.statSync(fullpath);

        var server = net.createServer((con) => {
            server.close();
            var readstream = fs.createReadStream(fullpath);
            readstream.pipe(con);
            readstream.on('end', () => {callback()})
        });
        server.listen(0, localAddress, null, () => {
            address = server.address();
            data = {
                filename: basename,
                addr: ip.toLong(addr),
                port: address.port,
                length: filestat.size
            };
            client.ctcp(to, 'privmsg', format(send_template, data))
        });
    });
}

function sendChat(client, to, callback) {
    myip(client.opt.localAddress, (addr) => {
        if (!client.opt.localAddress) {
            var localAddress = '0.0.0.0';
        } else {
            var localAddress = client.opt.localAddress
        }

        var server = net.createServer((con) => {
            server.close();
            var chat = new Chat(con);
            callback(chat);
        });
        server.listen(0, localAddress, null, () => {
            address = server.address();
            data = {
                addr: ip.toLong(addr),
                port: address.port,
            };
            client.ctcp(to, 'privmsg', format(chat_template, data))
        });
    });
}

module.exports.sendFile = sendFile;
module.exports.sendChat = sendChat;
module.exports.patch = patch;