# FMLeecher
Track the scrobbles of multiple last.fm users, and queue their songs automatically into spotify.
![Example](https://cdn.discordapp.com/attachments/548683437524123660/781644098566225949/unknown.png)
____

## Why?
I enjoy listening to a wide variety of music, I enjoy listening to my friends music, and this lets me kill two birds with one stone.
___

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
        clientId: '', // https://developer.spotify.com/dashboard/applications
        secret: ''
      }
    }
    ````
4. `npm start`, and login to spotify with OAuth. (no details are sent externally I pwomisssee
5. CLI takes input with readline, just use `.adduser username` or `.removeuser username` to configure the list of people to listen to.

Read if cute.