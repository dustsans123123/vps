
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export CHROME_BIN=/usr/bin/google-chrome

wget https://github.com/cloudflare/cloudflared/releases/download/2025.7.0/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
nohup bash -c "./cloudflared-linux-amd64 tunnel run --token eyJhIjoiMGVlNDU0OWYwYTBmM2Q3ZmQyYzAzODc3NjE0NTQ5ZmQiLCJ0IjoiMjg4MjhkNzctNjhkMS00NjI1LWEzYTAtYzMzNTJlOWNjMDc0IiwicyI6Ik5qSTFOV1UxTWpZdE16bGlaQzAwWXpVd0xXRTJPV0l0TkdFMk5UUXlNek5sTXpBMiJ9" &

npm install puppeteer express body-parser axios ejs otplib @levminer/speakeasy






node server1.js
