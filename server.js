require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const SpotifyWebApi = require('spotify-web-api-node');
const execPromise = util.promisify(exec);

const app = express();

app.use(express.json());
app.use(express.static('public'));

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: `https://${process.env.RPI_IP}:5000/callback`
});

let accessToken = null;
let refreshToken = null;
let sleepTimer = null;

// Spotify Authorization
app.get('/login', (req, res) => {
    const scopes = ['user-read-playback-state', 'user-modify-playback-state'];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
});

// Spotify Callback
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    
    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        accessToken = data.body['access_token'];
        refreshToken = data.body['refresh_token'];
        
        spotifyApi.setAccessToken(accessToken);
        spotifyApi.setRefreshToken(refreshToken);
        
        res.redirect('/');
    } catch (error) {
        console.error('Error getting tokens:', error);
        res.send('Authentication failed: ' + error.message);
    }
});

// Refresh token automatically
async function refreshAccessToken() {
    if (!refreshToken) return;
    
    try {
        const data = await spotifyApi.refreshAccessToken();
        accessToken = data.body['access_token'];
        spotifyApi.setAccessToken(accessToken);
        console.log('Access token refreshed');
    } catch (error) {
        console.error('Error refreshing token:', error);
    }
}

// Refresh token every 50 minutes
setInterval(refreshAccessToken, 50 * 60 * 1000);

// Check authentication status
app.get('/api/spotify/auth-status', (req, res) => {
    res.json({ authenticated: !!accessToken });
});

// Play a specific playlist
app.post('/api/spotify/playlist', async (req, res) => {
    const { uri, shuffle } = req.body;
    
    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        // Enable shuffle if requested (default true)
        const shuffleMode = shuffle !== undefined ? shuffle : true;
        await spotifyApi.setShuffle(shuffleMode);

        await spotifyApi.play({ context_uri: uri });
        res.json({ status: 'success', message: 'Playlist started', shuffle: shuffleMode });
    } catch (error) {
        console.error('Error playing playlist:', error);
        res.status(500).json({ error: error.message });
    }
});

// Play/Pause
app.post('/api/spotify/playpause', async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const state = await spotifyApi.getMyCurrentPlaybackState();
        
        if (state.body && state.body.is_playing) {
            await spotifyApi.pause();
            res.json({ status: 'success', action: 'paused' });
        } else {
            await spotifyApi.play();
            res.json({ status: 'success', action: 'playing' });
        }
    } catch (error) {
        console.error('Error toggling playback:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current volume (keep existing endpoint)
app.get('/api/volume', async (req, res) => {
    try {
        const { stdout } = await execPromise('pactl get-sink-volume @DEFAULT_SINK@');
        const match = stdout.match(/(\d+)%/);
        const volume = match ? parseInt(match[1]) : 50;
        res.json({ volume });
    } catch (error) {
        console.error('Error getting volume:', error);
        res.status(500).json({ error: 'Failed to get volume' });
    }
});

// Set system volume (keep existing endpoint)
app.post('/api/volume', async (req, res) => {
    const { volume } = req.body;
    
    if (volume < 0 || volume > 100) {
        return res.status(400).json({ error: 'Volume must be between 0 and 100' });
    }
    
    try {
        await execPromise(`pactl set-sink-volume @DEFAULT_SINK@ ${volume}%`);
        res.json({ status: 'success', volume });
    } catch (error) {
        console.error('Error setting volume:', error);
        res.status(500).json({ error: 'Failed to set volume' });
    }
});

// Volume up (+5%)
app.post('/api/volume/up', async (req, res) => {
    try {
        await execPromise('pactl set-sink-volume @DEFAULT_SINK@ +5%');
        
        const { stdout } = await execPromise('pactl get-sink-volume @DEFAULT_SINK@');
        const match = stdout.match(/(\d+)%/);
        const volume = match ? parseInt(match[1]) : 50;
        
        res.json({ status: 'success', volume });
    } catch (error) {
        console.error('Error increasing volume:', error);
        res.status(500).json({ error: 'Failed to increase volume' });
    }
});

// Volume down (-5%)
app.post('/api/volume/down', async (req, res) => {
    try {
        await execPromise('pactl set-sink-volume @DEFAULT_SINK@ -5%');
        
        const { stdout } = await execPromise('pactl get-sink-volume @DEFAULT_SINK@');
        const match = stdout.match(/(\d+)%/);
        const volume = match ? parseInt(match[1]) : 50;
        
        res.json({ status: 'success', volume });
    } catch (error) {
        console.error('Error decreasing volume:', error);
        res.status(500).json({ error: 'Failed to decrease volume' });
    }
});

// Mute/Unmute
app.post('/api/volume/mute', async (req, res) => {
    try {
        await execPromise('pactl set-sink-mute @DEFAULT_SINK@ toggle');
        
        const { stdout } = await execPromise('pactl get-sink-mute @DEFAULT_SINK@');
        const isMuted = stdout.includes('yes');
        
        res.json({ status: 'success', muted: isMuted });
    } catch (error) {
        console.error('Error toggling mute:', error);
        res.status(500).json({ error: 'Failed to toggle mute' });
    }
});

// Sleep timer endpoint
app.post('/api/spotify/sleep-timer', async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Clear any existing sleep timer
    if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
    }

    // Set timer for 45 minutes (45 * 60 * 1000 milliseconds)
    sleepTimer = setTimeout(async () => {
        try {
            await spotifyApi.pause();
            console.log('Sleep timer triggered - playback paused');
            sleepTimer = null;
        } catch (error) {
            console.error('Error pausing playback from sleep timer:', error);
        }
    }, 45 * 60 * 1000);

    console.log('Sleep timer set for 45 minutes');
    res.json({ status: 'success', message: 'Sleep timer set for 45 minutes' });
});

// Button A and B endpoints
app.post('/api/button/a', (req, res) => {
    console.log('Button A pressed');
    res.json({status: 'success', button: 'A'});
});

app.post('/api/button/b', (req, res) => {
    console.log('Button B pressed');
    res.json({status: 'success', button: 'B'});
});

const PORT = 5000;

// HTTPS configuration
const httpsOptions = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert')
};

https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`Home automation server running on HTTPS port ${PORT}`);
});
