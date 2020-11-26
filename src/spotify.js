import secrets from '../secrets.js'
import fetch from 'node-fetch'
import { colorLog } from './index.js'

let token = null // Don't touch
export const getSpotifyReady = () => !!token

// Gets the token if it's not set, or has expired. Currently not using the refresh_token cause calling the end point
// again just refreshes it anyway.
export const getHeaders = async (spotifyCode) => {
  if (!token || Date.now() >= token.expires_in) {
    // eslint-disable-next-line new-cap
    const preAuth = new Buffer.from(`${secrets.spotify.clientId}:${secrets.spotify.secret}`).toString('base64')
    const fetchToken = await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: { Authorization: `Basic ${preAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `code=${spotifyCode}&grant_type=authorization_code&redirect_uri=http://localhost:6969/callback`
      }
    )
    const result = await fetchToken.json()
    token = { token: result.access_token, refresh: result.refresh_token, expires: new Date(Date.now() + result.expires_in - 1 * 1000) }
    colorLog('yellow', 'Fetched spotify token.')
  }
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token.token}`
  }
}

export const addToQueue = async (uri, spotifyCode) => {
  const req = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${uri}`, { method: 'POST', headers: await getHeaders(spotifyCode) })
  const res = await req.json().catch(() => {})
  if (res && res.error) return res.error
  if (res) return new Error('An unexpected error occured.')
  return true
}

// This uses the search API, and will return the first exact match it finds. If it fails to find an exact match,
// It will keep expanding its list of partial matches until it has searched all results, and then return the most
// popular partial match, if there were any partial matches.
export const getTrackURI = async (songName, artistName, albumName, spotifyCode, existingSearch = { partial: [], traversed: 0 }) => {
  const result = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(`track:${songName}`)}&type=track&limit=50&offset=${existingSearch.traversed}`, { headers: await getHeaders(spotifyCode) })
  const rJSON = await result.json()
  const nowTraversed = existingSearch.traversed + 50
  if (!rJSON || !rJSON.tracks) return null
  const { tracks: { items, total } } = rJSON

  const fullMatches = items?.filter((track) => track.artists.map((a) => a.name).includes(artistName) && track.album.name === albumName)
  if (fullMatches?.[0]) return fullMatches[0].uri

  const partialMatches = items.filter((track) => track.artists.map((a) => a.name).includes(artistName))
  // I don't actually know if this part works, because it's never got here.
  if (nowTraversed >= total) return partialMatches?.sort((a, b) => b.popularity - a.popularity)?.[0] || null
  // eslint-disable-next-line promise/param-names
  await new Promise((r) => setTimeout(r, 350))
  return await getTrackURI(songName, artistName, albumName, spotifyCode, { partial: [...existingSearch.partial, ...partialMatches], traversed: nowTraversed })
}
