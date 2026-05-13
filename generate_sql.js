const fs = require('fs');

const constantsContent = fs.readFileSync('src/lib/constants.ts', 'utf-8');
const leaguesMatch = constantsContent.match(/export const LEAGUES = \[([\s\S]*?)\]\s*$/);

// Quick hack: we can just use Function to evaluate it if we modify it slightly
let evalCode = constantsContent.replace('export const LEAGUES', 'const LEAGUES');
evalCode += '\nmodule.exports = LEAGUES;';

// Let's write evalCode to a temporary JS file, then require it.
fs.writeFileSync('temp_constants.js', evalCode);
const LEAGUES = require('./temp_constants.js');

let sql = '';
LEAGUES.forEach(league => {
  league.teams.forEach(team => {
    sql += `INSERT INTO public.teams (id, league_id, name, logo_url) VALUES ('${team.id}', '${league.id}', '${team.name.replace(/'/g, "''")}', '${team.logo}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url, league_id = EXCLUDED.league_id;\n`;
  });
});

fs.writeFileSync('C:\\Users\\edição 001\\.gemini\\antigravity\\brain\\5e92ca6e-2b80-43fe-8d37-d6e04b634689\\fix_teams.sql', sql);
console.log('Done writing fix_teams.sql');
