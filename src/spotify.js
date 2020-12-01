import secrets from '../secrets.js'
import fetch from 'node-fetch'
import { colorLog } from './index.js'

let token = null // Don't touch
export const getSpotifyReady = () => !!token

// If there's no stored token, get one. If the stored token is expired, refresh it.
// Otherwise, return the stored token.
export const getHeaders = async (spotifyCode) => {
  if (!token || Date.now() >= token.expires) {
    // eslint-disable-next-line new-cap
    const preAuth = new Buffer.from(`${secrets.spotify.clientId}:${secrets.spotify.secret}`).toString('base64')
    const body = token?.refresh ? `refresh_token=${token.refresh}&grant_type=refresh_token` : `code=${spotifyCode}&grant_type=authorization_code&redirect_uri=http://localhost:6969/callback`
    const fetchToken = await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: { Authorization: `Basic ${preAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      }
    )
    const result = await fetchToken.json()
    token = { token: result.access_token, refresh: token?.refresh || result.refresh_token, expires: Date.now() + ((result.expires_in - 1) * 1000) }
    colorLog('yellow', 'Fetched spotify token.')
  }
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `${token?.refresh_token ? 'Basic' : 'Bearer'} ${token.token}`
  }
}

export const addToQueue = async (uri, spotifyCode) => {
  const cleanURI = uri.indexOf('spotify') === -1 ? `spotify:track:${uri}` : uri // Sometimes valid uris are returned without the spotify:track prefix.
  const req = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${cleanURI}`, { method: 'POST', headers: await getHeaders(spotifyCode) })
  const res = await req.json().catch(() => {})
  if (res && res.error) return new Error(res.error.message)
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
  const lowerArtistName = artistName.toLowerCase()
  const lowerAlbumName = albumName.toLowerCase()
  if (!rJSON || !rJSON.tracks) return existingSearch.partial?.sort((a, b) => b.popularity - a.popularity)?.[0]?.id || null
  const { tracks: { items, total } } = rJSON

  const fullMatches = items?.filter((track) => {
    const matchingTrackArtist = track.artists.map((a) => a.name.toLowerCase()).includes(lowerArtistName)
    const matchingAlbumArtist = track.album.artists.map((a) => a.name.toLowerCase()).includes(lowerArtistName)
    const matchingAlbumName = track.album.name.toLowerCase() === lowerAlbumName
    return (matchingTrackArtist || matchingAlbumArtist) && matchingAlbumName
  })
  if (fullMatches?.[0]) return fullMatches[0].uri

  const partialMatches = [...items.filter((track) => {
    const matchingTrackArtist = track.artists.map((a) => a.name.toLowerCase()).includes(lowerArtistName)
    const matchingAlbumArtist = track.album.artists.map((a) => a.name.toLowerCase()).includes(lowerArtistName)
    return matchingAlbumArtist || matchingTrackArtist
  }), ...existingSearch.partial]

  if (nowTraversed >= total) return partialMatches?.sort((a, b) => b.popularity - a.popularity)?.[0]?.id || null
  // eslint-disable-next-line promise/param-names
  await new Promise((r) => setTimeout(r, 350))
  return await getTrackURI(songName, lowerArtistName, lowerAlbumName, spotifyCode, { partial: partialMatches, traversed: nowTraversed })
}
