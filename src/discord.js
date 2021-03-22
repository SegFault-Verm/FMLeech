import Discord from 'discord.js'
import secrets from '../secrets.js'
import { getCurrentSong, getMemoryQueue } from './index.js'

export const client = secrets.discord.token ? new Discord.Client() : null

const genFullList = () => {
  const memQueue = getMemoryQueue()
  return memQueue
    .filter((_, i) => i < 6 || (i > memQueue.length - 6)) // Only select the first 6, and last 5 songs.
    .map((song, i) => { // Convert array to string
      if (i === 5 && memQueue.length > 10) return '...' // If this is the 6th song and there are more than 10, show ...
      return (`${i + 1}. _${song.user}_ - **${song.name}** by ${song.artist}`).replace(/[@`*_~#]/g, '') // Convert the song to string.
    })
}

if (client) {
  client.on('message', async msg => {
    if (msg.channel.id !== secrets.discord.channel) return
    const command = msg.content.toLowerCase()
    if (command === '!segq') {
      const q = genFullList()
      if (!q.length) { msg.channel.send('Seg\'s Spotify Queue is empty.'); return }
      await msg.channel.send(`**__Segs Spotify Queue:__**\n${q.join('\n')}`)
    }
    if (command === '!segwho') {
      const { user, name, artist } = getCurrentSong() || {}
      if (!user) { msg.channel.send('Segs current song has not been registered yet.'); return }
      await msg.channel.send(`Seg's Current Song was queued by **${user}**: ${name} by ${artist}. (this might not be completely accurate)`)
    }
  })

  client.login(secrets.discord.token)
}
