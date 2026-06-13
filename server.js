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

async function start() {
  await noblox.setCookie(ROBLOX_COOKIE);
  const currentUser = await noblox.getCurrentUser();
  console.log(`Logged in as ${currentUser.UserName}`);
}

app.post("/rank-bmt", async (req, res) => {
  try {
    const secret = req.headers["x-api-secret"];
    if (secret !== API_SECRET) {
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
    console.error(err);
    return res.status(500).json({ ok: false, error: "Ranking failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Ranker running on port ${PORT}`);
});

start().catch(console.error);