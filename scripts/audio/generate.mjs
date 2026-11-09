// Pre-generates every spoken line and sound effect with ElevenLabs, at build time, on the owner's machine.
// The game never calls ElevenLabs. Catalog screen speech only plays recordings.
// Other dynamic output can use a local browser voice when a recording is missing.
//
//   node scripts/audio/generate.mjs --dry-run     count lines and characters, no key needed, no calls
//   node scripts/audio/generate.mjs --max-chars N generate whatever is missing, spending at most N characters
//                                                 (default 3000; needs ELEVENLABS_API_KEY in .env.local)
//   node scripts/audio/generate.mjs --sfx-only    sound effects only
//
// Output: public/audio/lines/<hash>.mp3, public/audio/sfx/<name>.mp3, public/audio/manifest.json.
// Manifest keys are "<role>|<spoken text>", where role is a sidekick id (bit, pixel, hoot), "narrator"
// or "client:<mission id>". Existing files are reused, so reruns only pay for new or changed lines.
// The key is read from .env.local and never printed.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cast = JSON.parse(readFileSync(join(root, 'scripts/audio/voices.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const sfxOnly = args.has('--sfx-only');
const outLines = join(root, 'public/audio/lines');
const outSfx = join(root, 'public/audio/sfx');
const manifestPath = join(root, 'public/audio/manifest.json');
// --content <dir> loads missions from another checkout (for example a lane worktree); output stays here.
const contentFlag = process.argv.indexOf('--content');
const contentRoot = contentFlag > 0 ? resolve(process.argv[contentFlag + 1]) : root;
// --max-chars <n> caps the speech characters one run may spend (default 3000). Music and sfx only
// generate when their file is missing, so they cost nothing on reruns.
const maxFlag = process.argv.indexOf('--max-chars');
const maxChars = maxFlag > 0 ? Number(process.argv[maxFlag + 1]) : 3000;

function readKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) return '';
  const m = readFileSync(envPath, 'utf8').match(/^ELEVENLABS_API_KEY=(.*)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

async function loadContent() {
  const server = await createServer({ root: contentRoot, configFile: false, logLevel: 'error',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { missions } = await server.ssrLoadModule('/src/missions/index.ts');
    const { sidekicks } = await server.ssrLoadModule('/src/missions/sidekicks.ts');
    const { playground } = await server.ssrLoadModule('/src/missions/playground.ts');
    const { firstWords, secondWords } = await server.ssrLoadModule('/src/missions/names.ts');
    const { signupRecordings } = await server.ssrLoadModule('/src/engine/codename.ts');
    const { catalogEntries } = await server.ssrLoadModule('/src/ui/speech-catalog.ts');
    return { missions, sidekicks, playground, signup: signupRecordings(firstWords, secondWords),
      catalog: catalogEntries() };
  } finally {
    await server.close();
  }
}

const LINE_KEYS = new Set(['text', 'say', 'speaker']);
function linesIn(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => linesIn(v, out));
  else if (value && typeof value === 'object') {
    if (typeof value.text === 'string' && Object.keys(value).every((k) => LINE_KEYS.has(k))) out.push(value);
    else Object.values(value).forEach((v) => linesIn(v, out));
  }
  return out;
}

/** Every (role, voice, spoken text) the game can play. Sidekick lines exist in all three sidekick voices. */
function buildJobs({ missions, sidekicks, playground, signup, catalog }) {
  const jobs = new Map();
  const add = (role, voice, spoken) => {
    const key = `${role}|${spoken}`;
    if (!jobs.has(key)) jobs.set(key, { role, voice, spoken });
  };
  const sidekickIds = Object.keys(cast.sidekicks);
  for (const m of missions) {
    const clientVoice = cast.clients[m.id] ?? cast.clients.default;
    for (const line of linesIn(m)) {
      const spoken = (line.say ?? line.text).trim();
      if (!spoken) continue;
      const speaker = line.speaker ?? 'sidekick';
      if (speaker === 'client') add(`client:${m.id}`, clientVoice, spoken);
      else if (speaker === 'sidekick') for (const id of sidekickIds) add(id, cast.sidekicks[id], spoken);
      else add('narrator', cast.narrator, spoken);
    }
  }
  // Playground intro and egg lines (sidekick voices). File contents and command output are not voiced.
  if (playground) {
    const lines = [...playground.intro, ...playground.eggs.flatMap((e) => e.found)];
    for (const line of lines) {
      const spoken = (line.say ?? line.text).trim();
      for (const id of sidekickIds) add(id, cast.sidekicks[id], spoken);
    }
  }
  for (const s of sidekicks) {
    const voice = cast.sidekicks[s.id];
    if (!voice) continue;
    for (const line of linesIn(s)) add(s.id, voice, (line.say ?? line.text).trim());
  }
  // Sign up prompt, the "Your name is" prefix and every codename word, in the narrator voice.
  for (const { role, spoken } of signup ?? []) add(role, cast.narrator, spoken);
  for (const { line } of catalog ?? []) {
    const spoken = (line.say ?? line.text).trim();
    if (!spoken) continue;
    if (!line.speaker || line.speaker === 'sidekick') {
      for (const id of sidekickIds) add(id, cast.sidekicks[id], spoken);
    } else add('narrator', cast.narrator, spoken);
  }
  return [...jobs.values()];
}

function listCatalog(entries) {
  let chars = 0;
  for (const { key, line } of entries) {
    const spoken = (line.say ?? line.text).trim();
    chars += spoken.length;
    console.log(`catalog ${key}: ${spoken.length} characters, ${line.speaker ?? 'sidekick'}: ${spoken}`);
  }
  console.log(`catalog: ${entries.length} lines, ${chars} characters`);
}

const fileFor = (job) =>
  createHash('sha1').update(`${job.voice}|${cast.model}|${JSON.stringify(cast.settings)}|${job.spoken}`).digest('hex').slice(0, 16) + '.mp3';

async function post(url, key, body, attempt = 1) {
  const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return post(url, key, body, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function runPool(items, size, fn) {
  let i = 0;
  const workers = Array.from({ length: size }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

async function main() {
  mkdirSync(outLines, { recursive: true });
  mkdirSync(outSfx, { recursive: true });
  const key = dryRun ? '' : readKey();
  if (!dryRun && !key) throw new Error('ELEVENLABS_API_KEY not found in the environment or .env.local');

  const manifest = { version: 1, lines: {}, sfx: {} };
  let failures = 0;

  if (!sfxOnly) {
    const content = await loadContent();
    const jobs = buildJobs(content);
    if (dryRun) listCatalog(content.catalog);
    const missing = jobs.filter((j) => !existsSync(join(outLines, fileFor(j))));
    const chars = missing.reduce((n, j) => n + j.spoken.length, 0);
    console.log(`lines: ${jobs.length} total, ${missing.length} to generate, about ${chars} characters`);
    console.log(`overall: ${jobs.length} jobs, ${jobs.reduce((sum, job) => sum + job.spoken.length, 0)} characters`);
    // Credit guard (founder 2026-11-07: be careful with usage). Refuse big runs unless the budget allows it.
    if (!dryRun && chars > maxChars) {
      throw new Error(`refusing: ${chars} characters exceeds --max-chars ${maxChars}. Run --dry-run, check the content is final, then pass a budget.`);
    }
    if (!dryRun) {
      let done = 0;
      await runPool(missing, 2, async (job) => {
        try {
          const url = `https://api.elevenlabs.io/v1/text-to-speech/${job.voice}?output_format=${cast.format}`;
          writeFileSync(join(outLines, fileFor(job)), await post(url, key, { text: job.spoken, model_id: cast.model, voice_settings: cast.settings }));
          if (++done % 25 === 0) console.log(`  ${done}/${missing.length}`);
        } catch (e) {
          failures++;
          console.log(`  FAILED ${job.role}: "${job.spoken.slice(0, 40)}" ${e.message}`);
        }
      });
    }
    for (const j of jobs) if (existsSync(join(outLines, fileFor(j)))) manifest.lines[`${j.role}|${j.spoken}`] = fileFor(j);
  }

  const sfx = Object.entries(cast.sfx);
  const missingSfx = sfx.filter(([name]) => !existsSync(join(outSfx, `${name}.mp3`)));
  console.log(`sfx: ${sfx.length} total, ${missingSfx.length} to generate`);
  if (!dryRun) {
    for (const [name, { prompt, seconds }] of missingSfx) {
      try {
        const url = `https://api.elevenlabs.io/v1/sound-generation?output_format=${cast.format}`;
        writeFileSync(join(outSfx, `${name}.mp3`), await post(url, key, { text: prompt, duration_seconds: seconds, prompt_influence: 0.6 }));
      } catch (e) {
        failures++;
        console.log(`  FAILED sfx ${name}: ${e.message}`);
      }
    }
  }
  for (const [name] of sfx) if (existsSync(join(outSfx, `${name}.mp3`))) manifest.sfx[name] = `${name}.mp3`;

  // Background music: one style (founder choice 2026-11-07: playful sneaky cartoon spy), a few variations.
  const outMusic = join(root, 'public/audio/music');
  mkdirSync(outMusic, { recursive: true });
  const music = Object.entries(cast.music?.tracks ?? {});
  const missingMusic = music.filter(([name]) => !existsSync(join(outMusic, `${name}.mp3`)));
  console.log(`music: ${music.length} total, ${missingMusic.length} to generate`);
  if (!dryRun) {
    for (const [name, { prompt, seconds }] of missingMusic) {
      try {
        const url = `https://api.elevenlabs.io/v1/music?output_format=${cast.music.format}`;
        const body = { prompt: `${cast.music.style} ${prompt}`, music_length_ms: seconds * 1000, force_instrumental: true };
        writeFileSync(join(outMusic, `${name}.mp3`), await post(url, key, body));
        console.log(`  music ${name} done`);
      } catch (e) {
        failures++;
        console.log(`  FAILED music ${name}: ${e.message}`);
      }
    }
  }
  manifest.music = {};
  for (const [name] of music) if (existsSync(join(outMusic, `${name}.mp3`))) manifest.music[name] = `${name}.mp3`;

  if (!dryRun) {
    if (sfxOnly && existsSync(manifestPath)) manifest.lines = JSON.parse(readFileSync(manifestPath, 'utf8')).lines ?? {};
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
    console.log(`manifest: ${Object.keys(manifest.lines).length} lines, ${Object.keys(manifest.sfx).length} sfx; failures: ${failures}`);
  }
  if (failures) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
