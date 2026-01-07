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
- Bluetooth speaker connected
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

### 3. Project Setup

```bash
# Create project directory
mkdir ~/home-automation
cd ~/home-automation

# Initialize npm project
npm init -y

# Install required packages
npm install express spotify-web-api-node
```

### 4. Copy Files

- Copy `server.js` to `~/home-automation/`
- Create `public` directory: `mkdir ~/home-automation/public`
- Copy `index.html` to `~/home-automation/public/`

### 5. Generate SSL Certificate

```bash
cd ~/home-automation
openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365
```

When prompted for "Common Name", enter your RPi's IP address.

### 6. Configure Spotify API

1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Note your Client ID and Client Secret
4. Add redirect URI: `https://YOUR_RPI_IP:5000/callback`
5. Update `server.js` with your credentials:
   - Replace `YOUR_CLIENT_ID`
   - Replace `YOUR_CLIENT_SECRET`
   - Replace `YOUR_RPI_IP` with your actual IP

### 7. Set Up Static IP (Recommended)

#### Option 1: Router DHCP Reservation
1. Find RPi's MAC address: `ip link show`
2. Configure DHCP reservation in your router

#### Option 2: Configure on RPi
```bash
sudo nano /etc/dhcpcd.conf
```

Add:
```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

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

Replace `YOUR_USERNAME` with your actual username.

Verify user ID:
```bash
id -u
```

If not 1000, update the paths in the service file.

### 9. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable home-automation.service
sudo systemctl start home-automation.service
sudo systemctl status home-automation.service
```

## Usage

1. Access the web interface at `https://YOUR_RPI_IP:5000`
2. Accept the self-signed certificate warning
3. Click "Connect Spotify" and authenticate
4. Use the controls:
   - Volume up/down buttons
   - Volume slider
   - Mute/unmute
   - Play/pause
   - Shuffle toggle
   - Playlist/album buttons

## Adding Your Own Playlists/Albums

1. Open Spotify and navigate to your playlist/album
2. Click the three dots (•••)
3. Share → Copy link
4. Extract the ID from the URL
5. Add a button in `index.html`:

```html
<button class="btn-playlist" onclick="playPlaylist('spotify:playlist:YOUR_ID')">
    🎵 Your Playlist Name
</button>
```

For albums, use `spotify:album:YOUR_ID`

## Troubleshooting

### Check Service Logs
```bash
sudo journalctl -u home-automation.service -f
```

### Check PulseAudio
```bash
pactl list sinks short
pactl get-sink-volume @DEFAULT_SINK@
```

### Test Bluetooth Connection
```bash
bluetoothctl
devices
info YOUR_SPEAKER_MAC
```

### Restart Service
```bash
sudo systemctl restart home-automation.service
```

## File Structure

```
~/home-automation/
├── server.js           # Main server file
├── server.key          # SSL private key
├── server.cert         # SSL certificate
├── package.json        # npm dependencies
├── node_modules/       # npm packages
└── public/
    └── index.html      # Web interface
```

## Security Notes

- This setup uses a self-signed certificate for HTTPS
- Safe for local network use only
- Do not expose to the internet without proper security measures
- Keep your Spotify API credentials secure

## License

MIT
