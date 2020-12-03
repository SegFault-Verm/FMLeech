import { LastFmNode } from 'lastfm'
import secrets from '../secrets.js'
import readline from 'readline-async'
import { readFileSync, writeFileSync } from 'fs'
import express from 'express'
import { addToQueue, getHeaders, getSpotifyReady, getTrackURI } from './spotify.js'
import open from 'open'
import { client } from './discord.js'

const memoryQueue = []
const lastfm = new LastFmNode({ api_key: secrets.lastfm.apiKey, secret: secrets.lastfm.secret })
const instantMode = false // If true, the targets don't need to scrobble to add to queue. Means it will queue the tracks they don't want to listen to.
const stalklist = [] // Don't touch this, use the .adduser username command.
let spotifyCode = null // Don't touch this either

export const getMemoryQueue = () => memoryQueue

export const colorLog = (color, log) => {
  const colors = {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  }
  console.log(colors[color], log, '\x1b[0m')
}

const printStalklist = () => {
  if (stalklist.length) colorLog('magenta', `Current stalklist: ${stalklist.map((item) => item.user).join(', ')}`)
  else colorLog('red', 'The stalklist is empty')
}

// Fired when any of the listneers for users fires.
const listenEvent = async (track, user) => {
  const { name, artist, album, url } = track
  if (!getSpotifyReady()) return // Make sure the token is initialised.
  const trackURI = await getTrackURI(name, artist['#text'], album['#text'], spotifyCode) // Try to find the correct spotify song.
  if (trackURI) {
    const add = await addToQueue(trackURI, spotifyCode) // Add to the spotify queue
    if (add) {
      memoryQueue.push({user: user, name, artist: artist['#text'], album: album['#text'] } )
      colorLog('cyan', `Added ${user}'s track to queue: ${name}, by ${artist['#text']}, on ${album['#text']} (${url})`)
      return
    }
    colorLog('red', `Failed to add ${user}'s track to queue: ${name}, by ${artist['#text']}, on ${album['#text']} (${url})`)
  }
  colorLog('red', `Unable to find ${user}'s track on Spotify: ${name}, by ${artist['#text']}, on ${album['#text']} (${url})`)
}

const addToStalkList = (user) => {
  if (stalklist.map((item) => item.user).indexOf(user) > -1) {
    colorLog('red', `${user} is already in the stalk list.`)
    return
  }
  // Create the listeners for this user. Currently no checking for whether or not the user is real.
  const handler = lastfm.stream(user)
  handler.on(instantMode ? 'nowPlaying' : 'scrobbled', (track) => listenEvent(track, user))
  handler.on('error', () => {})
  stalklist.push({ user, handler })
  handler.start()
  writeFileSync('stalkList.json', JSON.stringify({ stalklist: stalklist.map((item) => item.user) }))
  printStalklist()
}

const removeFromStalkList = (user) => {
  const theIndex = stalklist.map((item) => item.user).indexOf(user)
  if (!theIndex || theIndex === -1) {
    colorLog('red', `${user} is not on the stalk list.`)
    return
  }
  // Revoke the listners for this user.
  const theUser = stalklist[theIndex]
  theUser.handler.stop()
  delete theUser.handler
  stalklist.splice(theIndex, 1)
  writeFileSync('stalkList.json', JSON.stringify({ stalklist: stalklist.map((item) => item.user) }))
  printStalklist()
}

// Setup commands using readline-async.
readline.addCommands(
  {
    name: 'stalklist',
    description: 'Display the list of users you\'re stalking.',
    func: printStalklist
  },
  {
    name: 'adduser',
    description: 'Add a user to the stalk list.',
    func: addToStalkList
  },
  {
    name: 'removeuser',
    description: 'Remove a user from the stalk list.',
    func: removeFromStalkList
  },
  {
    name: 'exit',
    description: 'Exit the application.',
    func: () => process.exit(0)
  }
)
readline.onLine(() => colorLog('red', 'Command not found. Try .help\n'))
console.log('\n')

// Listen for the oauth screen.
const app = express()
app.get('/callback', (req, res) => {
  if (req.query.code) {
    spotifyCode = req.query.code
    getHeaders(spotifyCode)
    colorLog('yellow', 'Spotify oAuth complete.')
    res.send('Authorized, you can now close this tab.<script>window.close()</script>')
    return
  }
  res.status(403).send('There was an error with your spotify authentication, try again <a href=\'/login\'>here</a>.')
})
app.listen(6969)
colorLog('yellow', 'Opening browser to complete spotify oAuth.')
open(
    `https://accounts.spotify.com/authorize?response_type=code\
&client_id=${secrets.spotify.clientId}\
&scope=user-modify-playback-state\
&redirect_uri=${encodeURIComponent('http://localhost:6969/callback')}\
`)

// Initialise the already-stored listeners.
stalklist.push(...JSON.parse(readFileSync('stalkList.json', 'utf8')).stalklist.map((user) => ({ user, handler: [] })))
if (stalklist.length) colorLog('magenta', `Started listening to: ${stalklist.map((item) => item.user).join(', ')}. (waiting for scrobbles)`)
else colorLog('magenta', 'Use ".adduser LastFMusername" to get started.')

stalklist.forEach((item) => {
  const handler = lastfm.stream(item.user)
  handler.on(instantMode ? 'nowPlaying' : 'scrobbled', (track) => listenEvent(track, item.user))
  handler.on('error', () => {})
  handler.start()
  item.handler = handler
})

const segHandler = lastfm.stream('transphobia')
segHandler.on('error', () => {})
segHandler.on('nowPlaying', (track) => {
  let songIndexOfMemQ = null

  for(let i=0; i<memoryQueue.length; i++) {
    if(memoryQueue[i].name === track.name) {
      songIndexOfMemQ = i
      break
    }
  }
  if(songIndexOfMemQ) memoryQueue.splice(0, songIndexOfMemQ + 1)
})
segHandler.start()

console.log(client ? 'Initialized Discord': 'Failed to initialize Discord')