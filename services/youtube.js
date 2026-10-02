const axios = require("axios");

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

/**
 * Parses an ISO 8601 duration string (e.g. PT10M30S) into minutes.
 */
function getDurationMinutes(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 60 + minutes + seconds / 60;
}

/**
 * Calculates a semantic score based on title and description.
 * - AI match: +2
 * - Development: +2
 * - Tutorial: +1
 * - Unrelated: -3
 */
function calculateScore(title, description) {
  const text = (title + " " + description).toLowerCase();
  let score = 0;

  // AI match (+2)
  if (/ai\b|artificial intelligence|agent|gpt|gemini|claude|llm|no-code/i.test(text)) {
    score += 2;
  }
  // Development (+2)
  if (/build|develop|code|create|app\b|apps|saas|bot\b|workflow|game|automation|program/i.test(text)) {
    score += 2;
  }
  // Tutorial (+1)
  if (/tutorial|step-by-step|guide|how to|course/i.test(text)) {
    score += 1;
  }
  // Unrelated (-3)
  if (/news|stock|market|predict|motivation|trick|business|crypto|earnings|finance/i.test(text)) {
    score -= 3;
  }

  return score;
}

/**
 * Search YouTube with advanced filtering and ranking.
 */
async function searchVideos(keyword, apiKey, maxResults = 10) {
  console.log(`[YouTube API] Searching for "${keyword}" (Region: IN, Last 48 hrs)...`);

  const publishedAfter = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const videoIds = new Set();
  let pageToken = "";

  // 1. Search 3 pages to gather sufficient candidates (expanding pagination)
  for (let i = 0; i < 3; i++) {
    const response = await axios.get(YOUTUBE_SEARCH_URL, {
      params: {
        part: "id",
        q: keyword,
        type: "video",
        order: "date",
        regionCode: "IN",
        publishedAfter: publishedAfter,
        maxResults: 50,
        pageToken: pageToken || undefined,
        key: apiKey,
      },
    });

    const items = response.data.items || [];
    items.forEach((item) => {
      if (item.id && item.id.videoId) {
        videoIds.add(item.id.videoId);
      }
    });

    pageToken = response.data.nextPageToken;
    if (!pageToken) break; // Break early if there are no more pages
  }

  console.log(`[YouTube API] Found ${videoIds.size} unique videos. Fetching details...`);

  const uniqueIds = Array.from(videoIds);
  let detailedVideos = [];

  // 2. Fetch full video details in batches of 50
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batch = uniqueIds.slice(i, i + 50);
    const res = await axios.get(YOUTUBE_VIDEOS_URL, {
      params: {
        part: "snippet,contentDetails,statistics",
        id: batch.join(","),
        key: apiKey,
      },
    });
    detailedVideos.push(...(res.data.items || []));
  }

  // 3. Filter and Score
  let scoredVideos = [];
  detailedVideos.forEach((v) => {
    const title = v.snippet.title;
    const description = v.snippet.description;
    const durationMins = getDurationMinutes(v.contentDetails.duration);
    const views = parseInt(v.statistics.viewCount) || 0;

    // Strict 8-minute minimum duration rule
    if (durationMins < 8) return;

    // Semantic Scoring
    const score = calculateScore(title, description);

    // Minimum threshold check (Requires at least score >= 2, e.g. AI match)
    if (score >= 2) {
      scoredVideos.push({
        videoId: v.id,
        title: title,
        channel: v.snippet.channelTitle,
        publishedAt: v.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        score: score,
        views: views,
        duration: Math.round(durationMins) + " mins",
      });
    }
  });

  console.log(`[YouTube API] Candidates after duration & score filters: ${scoredVideos.length}`);

  // 4. Sort by view count descending
  scoredVideos.sort((a, b) => b.views - a.views);

  // 5. Select Top 10
  const topVideos = scoredVideos.slice(0, maxResults);

  // Log final stats for debugging
  if (topVideos.length > 0) {
    console.log(`[YouTube API] Top ${topVideos.length} selected videos:`);
    topVideos.forEach((v, idx) => {
      console.log(`  ${idx + 1}. [Score: ${v.score}, Views: ${v.views}, Dur: ${v.duration}] ${v.title.substring(0, 60)}...`);
    });
  }

  return topVideos;
}

module.exports = { searchVideos };
