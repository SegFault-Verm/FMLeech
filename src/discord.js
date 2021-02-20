import Discord from 'discord.js'
import secrets from '../secrets.js'
import { getMemoryQueue } from './index.js'

export const client = secrets.discord.token ? new Discord.Client() : null

const genFullList = () => {
  const translate = getMemoryQueue().map((song, i) => (`${i + 1}. _${song.user}_ - **${song.name}** by ${song.artist}`).replace(/[@`*_~#]/g, ''))
  const q = []
  while (translate.length) q.push(translate.splice(0, 30))
  return q
}

if (client) {
  client.on('message', async msg => {
    if (msg.content.toLowerCase() === '!segq' && msg.channel.id === secrets.discord.channel) {
      const q = genFullList()
      if (!q.length) { msg.channel.send('Seg\'s Spotify Queue is empty.'); return }
      for (let i = 0; i < q.length; i++) await msg.channel.send(`${i === 0 ? '**__Segs Spotify Queue:__**\n' : ''}${q[i].join('\n')}`)
    }
  })

  client.login(secrets.discord.token)
}
