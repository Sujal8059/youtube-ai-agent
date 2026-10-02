require("dotenv").config();

const { searchVideos } = require("./services/youtube");
const { sendAlert } = require("./services/mail");

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const alertTo = process.env.ALERT_TO;
  const keyword = process.env.SEARCH_KEYWORD;

  // Validate required environment variables
  const missing = [];
  if (!apiKey) missing.push("YOUTUBE_API_KEY");
  if (!gmailUser) missing.push("GMAIL_USER");
  if (!gmailPass) missing.push("GMAIL_PASS");
  if (!alertTo) missing.push("ALERT_TO");
  if (!keyword) missing.push("SEARCH_KEYWORD");

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing.join(", "));
    console.error("Copy .env.example to .env and fill in your values.");
    process.exit(1);
  }

  console.log(`Searching YouTube for: "${keyword}"...`);

  try {
    const videos = await searchVideos(keyword, apiKey);

    if (videos.length === 0) {
      console.log("No videos found.");
      return;
    }

    console.log(`Found ${videos.length} video(s). Sending email alert...`);

    await sendAlert({ gmailUser, gmailPass, alertTo, keyword, videos });

    console.log(`Email alert sent to ${alertTo}.`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
