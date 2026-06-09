const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BUCKET_URL = process.env.SUPABASE_URL + '/storage/v1/object/public/calm-music';

const tracks = [
  {
    titleVi: "Tiếng mưa rơi nhẹ trong rừng",
    hasLyrics: false,
    category: "rain",
    storagePath: "rain/sample1.mp3",
    publicUrl: BUCKET_URL + "/rain/sample1.mp3",
    originalName: "rain_forest.mp3",
  },
  {
    titleVi: "Bản Sonata Ánh Trăng",
    hasLyrics: false,
    category: "piano",
    storagePath: "piano/sample2.mp3",
    publicUrl: BUCKET_URL + "/piano/sample2.mp3",
    originalName: "moonlight.mp3",
  },
  {
    titleVi: "Chill Lofi buổi chiều",
    hasLyrics: true,
    category: "lofi",
    storagePath: "lofi/sample3.mp3",
    publicUrl: BUCKET_URL + "/lofi/sample3.mp3",
    originalName: "lofi_vibes.mp3",
  }
];

async function seed() {
  for (const track of tracks) {
    await pool.query(`
      INSERT INTO "CalmMusicTrack" 
      ("id", "titleVi", "hasLyrics", "category", "publicUrl", "storagePath", "originalName", "isActive", "createdAt", "updatedAt")
      VALUES 
      (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
    `, [track.titleVi, track.hasLyrics, track.category, track.publicUrl, track.storagePath, track.originalName]);
  }
  console.log("Inserted sample music tracks.");
  pool.end();
}

seed().catch(err => { console.error(err); pool.end(); });
