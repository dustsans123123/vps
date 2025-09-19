const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", "./views");
app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);
app.use(express.json());

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const captchaStore = new Map();

const generateCaptcha = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

fs.mkdirSync(path.join(__dirname, "sessions"), { recursive: true });

app.post('/total', (req, res) => {
  const folderPath = path.join(__dirname, 'sessions');

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('❌ Error reading folder:', err);
      return res.status(500).json({ error: 'Failed to received' });
    }

    const txtFiles = files.filter(file => file.endsWith('.txt'));
    res.json({ count: txtFiles.length });
  });
});

app.get("/", (req, res) => {
  const captcha = generateCaptcha();
  const captchaId = Math.random().toString(36).substring(2, 10);
  captchaStore.set(captchaId, captcha);
  res.render("form", { captcha, captchaId });
});

app.post("/login", async (req, res) => {
  const { email, password, captchaInput, captchaId } = req.body;

  if (!captchaStore.has(captchaId)) {
    return res.status(400).send("Invalid captcha session. Please reload page.");
  }

  const correctCaptcha = captchaStore.get(captchaId);
  captchaStore.delete(captchaId);

  if (captchaInput !== correctCaptcha) {
    return res.status(400).send("Incorrect captcha entered.");
  }

  let browser;
  try {
    const { stdout: chromiumPath } = await promisify(exec)("which google-chrome");

    browser = await puppeteer.launch({
      headless: true,
        args: [
           "--no-sandbox",
           "--disable-setuid-sandbox",
           `--proxy-server=socks5://127.0.0.1:9050`
    ],
      executablePath: chromiumPath.trim(),
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.resourceType() === "image") {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto("https://learn.learn.nvidia.com/login", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#email");
    await page.type("#email", email);

    await page.waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn && !btn.disabled;
    });
    await page.click('button[type="submit"]');

    await page.waitForSelector("#signinPassword", { timeout: 15000 });
    await page.type("#signinPassword", password);

    await page.waitForFunction(() => {
      const btn = document.querySelector("#passwordLoginButton");
      return btn && !btn.disabled;
    });
    await page.click("#passwordLoginButton");

    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await sleep(60 * 1000);

    await page.goto("https://learn.learn.nvidia.com/dashboard", {
      waitUntil: "networkidle2",
    });

    const cookies = await page.cookies();
    const sessionCookie = cookies.find(
      (c) => c.name.toLowerCase() === "sessionid"
    );

    if (!sessionCookie) {
      return res.send("❌ Get failed, you did not verify mail or account invalid.");
    }

    const sessionValue = sessionCookie.value;
    const filename = `sessions-${Math.random().toString(36).substring(2, 10)}.txt`;
    const filepath = path.join(__dirname, "sessions", filename);
    fs.writeFileSync(filepath, sessionValue);

    res.send(`
      <div style="padding: 2rem; font-family: sans-serif;">
        <h3>✅ Token Verifications</h3>
        <textarea id="sessionText" rows="4" cols="80" readonly>${sessionValue}</textarea>
        <br />
        <button id="copyBtn" class="btn btn-primary mt-2">Copy to Clipboard</button>
        <p>Saved as: <code>${filename}</code></p>

        <script>
          const copyBtn = document.getElementById('copyBtn');
          copyBtn.addEventListener('click', () => {
            const textArea = document.getElementById('sessionText');
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            try {
              const successful = document.execCommand('copy');
              alert(successful ? 'Copied to clipboard!' : 'Failed to copy!');
            } catch (err) {
              alert('Error copying text: ' + err);
            }
            window.getSelection().removeAllRanges();
          });
        </script>
      </div>
    `);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("❌ Get failed, you did not verify mail or account invalid.");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(3000, () => {
  console.log("🌐 Open http://localhost:3000 in your browser");
});
