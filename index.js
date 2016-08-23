'use strict';

var traverse = require('traverse');
var express = require('express');
var moment = require('moment');
var BootBot = require('bootbot');
var fetch = require('node-fetch');
var chrono = require('chrono-node');
var DateDiff = require('date-diff');
var CronJob = require('cron').CronJob;

var Config = require('./config');
var Strings = require('./strings');

var port = process.env.PORT || 5000;
var app = express();
const GIPHY_URL = `http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=`;

var sayy = function (language, obj) {
    var result = traverse(obj).map(function (item) {
        if (this.key === language) {
            this.parent.update(item);
        }
    });
    return result;
};

const bot = new BootBot({
    accessToken: Config.FB_PAGE_TOKEN,
    verifyToken: Config.FB_VERIFY_TOKEN,
    appSecret: Config.FB_APP_SECRET
});

bot.setGetStartedButton((payload, chat) => {
    chat.getUserProfile().then((user) => {
        var language = user.locale.substring(0, 2).toLowerCase();
        // console.log(`Language: ${language}`);
        var questionBtn0 = `${sayy(`${language}`, Strings.words.first_question_btn)[0]}`;
        var questionBtn1 = `${sayy(`${language}`, Strings.words.first_question_btn)[1]}`;
        chat.say({
            text: `${sayy(`${language}`, Strings.words.greetings)}, ${user.first_name} !.${sayy(`${language}`, Strings.words.welcome)}`,
            quickReplies: [`${questionBtn0}`, `${questionBtn1}`]
        });
        bot.hear([`${questionBtn0}`], (payload, chat) => {
            chat.conversation((convo) => {
                convo.ask(`${sayy(`${language}`, Strings.words.asking_due_day)}`, (payload, convo) => {
                    const text = payload.message.text;
                    var dueDateFormatted = chrono.parseDate(text);
                    var diff = 40 - Date.diff(dueDateFormatted, chrono.parseDate('Today')).weeks();
                    console.log(diff);
                    diff = Math.ceil(diff) - 1;
                    convo.say(`${sayy(`${language}`, Strings.words.your_week)} ${diff}\n\n${sayy(`${language}`, Strings.words.weeks.baby)[diff]}`).then(() => {
                        convo.say(`${sayy(`${language}`, Strings.words.weeks.mom)[diff]}`).then(() => {
                            chat.say({
                                attachment: 'image',
                                url: `${Strings.words.pictures.url[diff]}`,
                                typing: true
                            })
                        });
                    });
                });
            });
        });
        bot.hear([`${questionBtn1}`], (payload, chat) => {
            chat.conversation((convo) => {
                convo.ask(`${sayy(`${language}`, Strings.words.asking_menstrual_day)}`, (payload, convo) => {
                    const text = payload.message.text;
                    var dueDateFormatted = chrono.parseDate(text);
                    var diff = Date.diff(chrono.parseDate('Today'), dueDateFormatted).weeks();
                    console.log(diff);
                    diff = Math.ceil(diff) - 1;
                    convo.say(`${sayy(`${language}`, Strings.words.your_week)} ${diff}\n\n${sayy(`${language}`, Strings.words.weeks)[diff]}`).then(() => {
                        convo.say('\ntest').then(() => {
                            chat.say({
                                attachment: 'image',
                                url: `${Strings.words.pictures.url[diff]}`,
                                typing: true
                            })
                        });
                    });
                });
            });
        });
    });
});

bot.on('message', (payload, chat) => {
    new CronJob('0 * * * * *', function () {
        chat.sendTextMessage('Cron message every minute');
    }, null, true, 'America/Los_Angeles');
});

bot.on('attachment', (payload, chat) => {
    // Reply to the user
    chat.say('I am sorry. I cant receive any attachment yet');
});

bot.hear(['hi'], (payload, chat) => {
    chat.getUserProfile().then((user) => {
        chat.say(`Hello, ${user.first_name} !`, { typing: true });
    });
});

bot.hear(['hello', /hey( there)?/i], (payload, chat) => {
    chat.getUserProfile().then((user) => {
        chat.say(`Hello, ${user.first_name} !.You are a ${user.gender}, locale: ${user.locale} and your timezone is: ${user.timezone}`, { typing: true });
    });
});

bot.hear(['help'], (payload, chat) => {
    // Send a text message with buttons
    chat.say({
        text: 'What do you need help with?',
        buttons: [
            { type: 'postback', title: 'Settings', payload: 'HELP_SETTINGS' },
            { type: 'postback', title: 'FAQ', payload: 'HELP_FAQ' },
            { type: 'postback', title: 'Talk to a human', payload: 'HELP_HUMAN' }
        ]
    });
});

bot.hear(/gif (.*)/i, (payload, chat, data) => {
  const query = data.match[1];
  chat.say('Searching for the perfect gif...');
  fetch(GIPHY_URL + query)
    .then(res => res.json())
    .then(json => {
      chat.say({
        attachment: 'image',
        url: json.data.image_url
      }, {
        typing: true
      });
    });
});

bot.start(port || 5000); //fix heroku problem 60 seconds