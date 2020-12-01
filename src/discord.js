import Discord from 'discord.js';
import secrets from '../secrets.js';
import { getMemoryQueue } from './index.js';
export const client = new Discord.Client();

const genFullList = () => {
  const translate = getMemoryQueue().map((song, i) => `${i+1}. _${song.user}_ - **${song.name}** by ${song.artist}`)
  const q = []
  while(translate.length) q.push(translate.splice(0, 20))
  return q
}

client.on('message', async msg => {
  if (msg.content.toLowerCase() === '!segq' && msg.channel.id === '765367648615399425') {
    const q = genFullList()
    if(!q.length) {
      msg.channel.send('Seg\'s Spotify Queue is empty.')
      return
    }
    for(let i=0; i<q.length; i++) {
      await msg.channel.send(`${i === 0 ? '**__Segs Spotify Queue:__**\n' : ''}${q[i].join('\n')}`)
    }
  }
});

client.login(secrets.discord.token);