# Home Automation with Raspberry Pi

This project provides a web interface to control your Raspberry Pi home automation system with Spotify integration and volume controls.

## Features

- 🔊 System volume control (up/down/mute/slider)
- 🎵 Spotify playback control
- 🎼 Play playlists and albums
- 🔀 Shuffle control
- ⏯️ Play/Pause
- 🔘 Custom button controls (A/B)

## Prerequisites

- Raspberry Pi 4 (or similar)
- Bluetooth speaker connected (or AUX cable)
- Spotify Premium account
- Node.js and npm installed

## Setup Instructions

### 1. Install Dependencies

```bash
# Update system
sudo apt update

# Install Node.js and npm if not installed
sudo apt install nodejs npm -y

# Install PulseAudio and Bluetooth support
sudo apt install bluetooth bluez pulseaudio pulseaudio-module-bluetooth -y
```

### 2. Install Raspotify (Spotify Connect)

```bash
curl -sL https://dtcooper.github.io/raspotify/install.sh | sh
```

Configure for Bluetooth following: https://github.com/dtcooper/raspotify/wiki/Play-via-Bluetooth-Speaker

### 3. Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/home-automation.git
cd home-automation

# Install npm dependencies
npm install
```

### 4. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```bash
   nano .env
   ```

3. Fill in your values:
   ```
   SPOTIFY_CLIENT_ID=your_actual_client_id
   SPOTIFY_CLIENT_SECRET=your_actual_client_secret
   RPI_IP=192.168.1.100
   ```

### 5. Get Spotify API Credentials

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in:
   - **App name**: "Home Automation"
   - **App description**: "Control my RPi"
   - **Redirect URI**: `https://YOUR_RPI_IP:5000/callback` (use the IP from your `.env` file)
5. Check the boxes and click "Save"
6. Copy your **Client ID** and **Client Secret** to your `.env` file

### 6. Generate SSL Certificate

```bash
cd ~/home-automation
openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365
```

When prompted for "Common Name", enter your RPi's IP address (same as in `.env` file).

### 7. Set Up Static IP (Recommended)

#### Option 1: Router DHCP Reservation (Recommended)
1. Find RPi's MAC address: `ip link show`
2. Configure DHCP reservation in your router's admin panel
3. Assign the same IP you used in your `.env` file

#### Option 2: Configure on RPi
```bash
sudo nano /etc/dhcpcd.conf
```

Add (adjust for your network):
```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

Replace values with your network configuration. For WiFi, use `interface wlan0`.

### 8. Create Systemd Service

```bash
sudo nano /etc/systemd/system/home-automation.service
```

Add:
```ini
[Unit]
Description=Home Automation Node.js Server
After=network.target

[Service]
User=YOUR_USERNAME
Group=YOUR_USERNAME
SupplementaryGroups=audio
Environment="XDG_RUNTIME_DIR=/run/user/1000"
Environment="PULSE_SERVER=unix:/run/user/1000/pulse/native"
Type=simple
WorkingDirectory=/home/YOUR_USERNAME/home-automation
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Important:** Replace `YOUR_USERNAME` with your actual username.

Verify your user ID:
```bash
id -u
```

If it's not `1000`, update the paths in the service file to use your actual user ID.

### 9. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable home-automation.service
sudo systemctl start home-automation.service
sudo systemctl status home-automation.service
```

## Usage

1. Access the web interface at `https://YOUR_RPI_IP:5000` (use the IP from your `.env` file)
2. Accept the self-signed certificate warning (this is safe on your local network):
   - **Chrome/Edge**: Click "Advanced" → "Proceed to [IP] (unsafe)"
   - **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
   - **Safari**: Click "Show Details" → "visit this website"
3. Click "Connect Spotify" and authenticate with your Spotify account
4. Use the controls:
   - **Volume up/down buttons** - Adjust system volume by 5%
   - **Volume slider** - Set precise volume level
   - **Mute/unmute** - Toggle audio mute
   - **Play/pause** - Control Spotify playback
   - **Shuffle toggle** - Enable/disable shuffle mode
   - **Playlist/album buttons** - Start playing playlists or albums

## Adding Your Own Playlists/Albums

### Get Playlist/Album URI

1. Open Spotify (desktop app or web player)
2. Navigate to your playlist or album
3. Click the three dots (•••)
4. Hover over "Share"
5. Click "Copy link"
6. You'll get a URL like: `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`

### Convert to URI Format

- **Playlist**: `spotify:playlist:37i9dQZF1DXcBWIGoYBM5M`
- **Album**: `spotify:album:2ODvWsOgouMbaA5xf0RkJe`

### Add Button to UI

Edit `public/index.html` and add a button:

```html
<!-- For playlists -->
<button class="btn-playlist" onclick="playPlaylist('spotify:playlist:YOUR_ID')">
    🎵 Your Playlist Name
</button>

<!-- For albums -->
<button class="btn-playlist" onclick="playPlaylist('spotify:album:YOUR_ID')">
    🎸 Album Name - Artist
</button>
```

Restart the service after making changes:
```bash
sudo systemctl restart home-automation.service
```

## Audio Output Configuration

### Switch Between Bluetooth and AUX

#### To AUX Cable:
```bash
pactl set-default-sink alsa_output.platform-bcm2835_audio.analog-stereo
```

#### To Bluetooth:
```bash
pactl set-default-sink bluez_sink.YOUR_SPEAKER_MAC.a2dp_sink
```

The web interface volume controls will work with whichever output is selected.

## Troubleshooting

### Check Service Logs
```bash
# View live logs
sudo journalctl -u home-automation.service -f

# View recent logs
sudo journalctl -u home-automation.service -n 50 --no-pager
```

### Service Not Starting
```bash
# Check service status
sudo systemctl status home-automation.service

# Restart service
sudo systemctl restart home-automation.service

# View detailed errors
sudo journalctl -u home-automation.service -n 100 --no-pager
```

### Volume Controls Not Working
```bash
# Check PulseAudio sinks
pactl list sinks short

# Get current volume
pactl get-sink-volume @DEFAULT_SINK@

# Test audio manually
speaker-test -t wav -c 2
```

### Bluetooth Issues
```bash
# Check Bluetooth status
bluetoothctl

# Inside bluetoothctl:
devices
info YOUR_SPEAKER_MAC
connect YOUR_SPEAKER_MAC
exit
```

### Spotify Authentication Fails
1. Verify your `.env` file has correct credentials
2. Check the redirect URI in Spotify Developer Dashboard matches: `https://YOUR_RPI_IP:5000/callback`
3. Make sure you're using HTTPS (not HTTP)
4. Restart the service after changing `.env`

### Certificate Warnings
The self-signed SSL certificate will trigger browser warnings. This is expected and safe on your local network. Each browser/device needs to accept the certificate once.

## File Structure

```
~/home-automation/
├── server.js           # Main server file
├── server.key          # SSL private key (generated)
├── server.cert         # SSL certificate (generated)
├── .env                # Environment variables (not in git)
├── .env.example        # Environment template (in git)
├── .gitignore          # Git ignore rules
├── package.json        # npm dependencies
├── package-lock.json   # npm lock file
├── node_modules/       # npm packages (not in git)
├── README.md           # This file
└── public/
    └── index.html      # Web interface
```

## Security Notes

- This setup uses a self-signed certificate for HTTPS
- Safe for local network use only
- **Do not expose to the internet** without proper security measures
- The `.env` file is excluded from git to keep credentials private
- Never commit `.env` to version control
- SSL certificates (`.key` and `.cert` files) are also excluded from git

## Development

### Making Changes

After modifying code:

```bash
# Restart the service
sudo systemctl restart home-automation.service

# Check for errors
sudo journalctl -u home-automation.service -f
```

### Git Workflow

```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Description of changes"

# Push to GitHub
git push
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature-name`
6. Create a Pull Request

## License

MIT

## Acknowledgments

- [Raspotify](https://github.com/dtcooper/raspotify) for Spotify Connect support
- [Spotify Web API Node](https://github.com/thelinmichael/spotify-web-api-node) for Spotify integration
- Express.js for the web server framework
