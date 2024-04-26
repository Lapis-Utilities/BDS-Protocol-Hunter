const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

require("dotenv").config();

let { WEBHOOK_URL: URL } = process.env;

if (!URL) {
  console.error("You must include a WEBHOOK_URL in the .env file.");
  process.exit(1);
}

const latestVersionEndpoint = 'https://itunes.apple.com/lookup?bundleId=com.mojang.minecraftpe&time=' + Date.now();

getMCInformation();

setInterval(getMCInformation, 21600000);

function getMCInformation() {
  axios.get(latestVersionEndpoint)
  .then(async response => {
    const versionData = response.data;
    fs.writeFileSync('./results.json', JSON.stringify(versionData));

    const result = versionData.results[0];
    const version = result.version;
    
    console.log("Latest Minecraft Version:", version);

    let protocolVersions = [];
    
    if (fs.existsSync('./protocol_versions.json')) {
      const fileData = fs.readFileSync('./protocol_versions.json', 'utf8');
      protocolVersions = fileData ? JSON.parse(fileData) : [];
    }

    const protocolVersion = await getTextFromWebsite(version);

    if (!protocolVersions.some(existingVersion => existingVersion[0] === protocolVersion[0])) {
      protocolVersions.push(protocolVersion);
      console.log("New Protocol Version added:", protocolVersion[0]);

      send({
        username: "BDS Protocol Hunter",
        embeds: [
          {
            title: "System",
            description: `New protocol version found \n\n**${version}**: **${protocolVersion}**`,
            color: 65280,
            footer: {
              text: `BDS Protocol Hunter | Version: ${version}`,
            },
          },
        ],
      });

      fs.writeFileSync('./protocol_versions.json', JSON.stringify(protocolVersions));

      console.log("Updated Protocol Versions saved to protocol_versions.json");
    } else {
      console.log("No new protocol version found or already exists.");
    }
  })
  .catch(error => {
    console.error("Error fetching or updating protocol versions:", error);
  });
}

function getTextFromWebsite(version) {
  return new Promise((resolve, reject) => {
    axios.get(`https://minecraft.wiki/w/Bedrock_Edition_${version}`)
      .then(response => {
        const $ = cheerio.load(response.data);
        const text = $('p').text();
        const threeDigitNumbers = text.match(/\b\d{3}\b/g);
        resolve(threeDigitNumbers);
      })
      .catch(error => {
        reject(error);
      });
  });
}

function send(params) {
  axios.post(URL, params)
    .then(response => {
      console.log("Webhook sent successfully.");
    })
    .catch(error => {
      console.error("Error sending webhook:", error);
    });
}