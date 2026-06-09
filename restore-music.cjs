const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function restoreMusic() {
  console.log("Starting restore process from Supabase Storage...");
  
  // Clean up the dummy data I inserted earlier first to avoid duplication
  await pool.query('DELETE FROM "CalmMusicTrack"');
  console.log("Cleared old/dummy records from database.");

  // Get folders
  const { data: folders, error: folderError } = await supabase.storage.from('calm-music').list('', { limit: 100 });
  if (folderError) throw folderError;

  let count = 0;

  for (const folder of folders) {
    if (!folder.id) { // It's a directory
      const category = folder.name; // rain, nature, piano, lofi, general
      console.log(`Checking folder: ${category}`);
      
      const { data: files, error: fileError } = await supabase.storage.from('calm-music').list(category, { limit: 100 });
      if (fileError) throw fileError;

      for (const file of files) {
        if (file.name !== '.emptyFolderPlaceholder') {
          const storagePath = `${category}/${file.name}`;
          const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/calm-music/${storagePath}`;
          
          // Guess metadata from file name
          // Usually file names uploaded by app look like: timestamp-safeName.ext
          let titleVi = file.name;
          const match = file.name.match(/^\d+-(.+)\.[a-zA-Z0-9]+$/);
          if (match) {
            titleVi = match[1].replace(/_/g, ' ');
          }

          const hasLyrics = category === 'lofi' || category === 'general'; // Default guess

          console.log(`Restoring: ${titleVi}`);

          await pool.query(`
            INSERT INTO "CalmMusicTrack" 
            ("id", "titleVi", "hasLyrics", "category", "publicUrl", "storagePath", "originalName", "isActive", "createdAt", "updatedAt")
            VALUES 
            (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
          `, [titleVi, hasLyrics, category, publicUrl, storagePath, file.name]);

          count++;
        }
      }
    }
  }

  console.log(`Successfully restored ${count} music tracks from Supabase Storage.`);
  pool.end();
}

restoreMusic().catch(err => {
  console.error(err);
  pool.end();
});
