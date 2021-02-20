# FMLeech
Track the scrobbles of multiple last.fm users, and queue their songs automatically into spotify.

![Example](https://cdn.discordapp.com/attachments/548683437524123660/781652606338596924/unknown.png)

## Why?
I enjoy listening to a wide variety of music, I enjoy listening to my friends music, and this lets me kill two birds with one stone.

## How?

1. `git clone` this repo
2. `npm i` to install.
3. Create `./secrets.js` with the following format:

    ```js
    export default {
      lastfm: { 
        apiKey: '', // https://www.last.fm/api/account/create
        secret: ''
      },
      spotify: {
        clientId: '', // https://developer.spotify.com/dashboard/applications and set the redirectUri to http://localhost:6969/callback
        secret: ''
      },
      discord: {
        token: '', // Discord bot token. Exclude this field or set it to null to disable the !segQ command.
        channel: '' // The channel the command works in
      }
    }
    ````
4. `npm start`, and login to spotify with OAuth. (no details are sent externally I pwomisssee
5. CLI takes input with readline, just use `.adduser username` or `.removeuser username` to configure the list of people to listen to. There is no

Read if cute.
