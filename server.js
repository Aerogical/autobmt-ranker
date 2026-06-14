const express = require("express");
const noblox = require("noblox.js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GROUP_ID = Number(process.env.GROUP_ID);
const E1_RANK = Number(process.env.E1_RANK);
const E2_RANK = Number(process.env.E2_RANK);
const API_SECRET = process.env.API_SECRET;
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;

const rankGamepassMap = {
  3604594447: 179, // Private
  3604594493: 182, // Sergeant
  3604594523: 184, // Sergeant First Class
  3604594566: 189, // First Lieutenant
};

async function start() {
  await noblox.setCookie(ROBLOX_COOKIE);
  const currentUser = await noblox.getCurrentUser();
  console.log(`Logged in as ${currentUser.UserName}`);
}

function isAuthorized(req) {
  const headerSecret = req.headers["x-api-secret"];
  const bodySecret = req.body && req.body.secret;
  return headerSecret === API_SECRET || bodySecret === API_SECRET;
}

app.post("/rank-bmt", async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const userId = Number(req.body.userId);
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    const currentRank = await noblox.getRankInGroup(GROUP_ID, userId);

    if (currentRank !== E1_RANK) {
      return res.status(400).json({
        ok: false,
        error: `User is rank ${currentRank}, expected E1 rank ${E1_RANK}`,
      });
    }

    await noblox.setRank(GROUP_ID, userId, E2_RANK);

    return res.json({ ok: true, userId, promotedTo: E2_RANK });
  } catch (err) {
    console.error("BMT ranking failed:", err);
    return res.status(500).json({
      ok: false,
      error: "Ranking failed",
      details: String(err.message || err),
    });
  }
});

app.post("/rank-gamepass", async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const userId = Number(req.body.userId);
    const gamepassId = Number(req.body.gamepassId);
    const targetRank = rankGamepassMap[gamepassId];

    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    if (!targetRank) {
      return res.status(400).json({
        ok: false,
        error: `Unsupported gamepassId ${gamepassId}`,
      });
    }

    const currentRank = await noblox.getRankInGroup(GROUP_ID, userId);

    if (currentRank >= targetRank) {
      return res.json({
        ok: true,
        userId,
        gamepassId,
        alreadyRanked: true,
        currentRank,
        promotedTo: currentRank,
      });
    }

    await noblox.setRank(GROUP_ID, userId, targetRank);

    return res.json({
      ok: true,
      userId,
      gamepassId,
      previousRank: currentRank,
      promotedTo: targetRank,
    });
  } catch (err) {
    console.error("Rank gamepass failed:", err);
    return res.status(500).json({
      ok: false,
      error: "Ranking failed",
      details: String(err.message || err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Ranker running on port ${PORT}`);
});

start().catch(console.error);
