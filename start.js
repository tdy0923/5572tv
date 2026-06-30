#!/usr/bin/env node

/* eslint-disable no-console */
const http = require('http');
const path = require('path');

function generateManifest() {
  console.log('Generating manifest.json for Docker deployment...');
  try {
    require(path.join(__dirname, 'scripts', 'generate-manifest.js'));
  } catch (error) {
    console.error('Error calling generate-manifest.js:', error);
    throw error;
  }
}

generateManifest();

require('./server.js');

const TARGET_URL = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}/login`;

const intervalId = setInterval(() => {
  console.log(`Fetching ${TARGET_URL} ...`);
  const req = http.get(TARGET_URL, (res) => {
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      console.log('Server is up, stop polling.');
      clearInterval(intervalId);
      setTimeout(executeCronJob, 30000);
      setInterval(executeCronJob, 60 * 60 * 1000);
    }
  });
  req.setTimeout(2000, () => req.destroy());
  req.on('error', () => {});
}, 1000);

function executeCronJob() {
  const cronUrl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}/api/cron`;
  console.log(`Executing cron job: ${cronUrl}`);
  const req = http.get(cronUrl, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Cron job executed successfully:', data);
      } else {
        console.error('Cron job failed:', res.statusCode, data);
      }
    });
  });
  req.on('error', (err) => console.error('Cron job error:', err));
  req.setTimeout(300000, () => {
    req.destroy();
  });
}
// rebuild 1782808510
