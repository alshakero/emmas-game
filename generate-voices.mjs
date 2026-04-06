import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf-8')
  .split('\n')
  .reduce((acc, line) => {
    const eq = line.indexOf('=');
    if (eq > 0) acc[line.substring(0, eq).trim()] = line.substring(eq + 1).trim();
    return acc;
  }, {});

const API_KEY = env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io';

const animals = [
  { num: 1,  name: 'Lion' },
  { num: 2,  name: 'Elephant' },
  { num: 3,  name: 'Horse' },
  { num: 4,  name: 'Hippo' },
  { num: 5,  name: 'Tiger' },
  { num: 6,  name: 'Dog' },
  { num: 7,  name: 'Duck' },
  { num: 8,  name: 'Chicken' },
  { num: 9,  name: 'Monkey' },
  { num: 10, name: 'Rhino' },
  { num: 11, name: 'Wolf' },
  { num: 12, name: 'Fox' },
  { num: 13, name: 'Frog' },
  { num: 14, name: 'Crocodile' },
  { num: 15, name: 'Mouse' },
  { num: 16, name: 'Cow' },
  { num: 17, name: 'Cat' },
  { num: 18, name: 'Sheep' },
];

function article(name) {
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

async function listVoices() {
  const res = await fetch(`${BASE_URL}/v1/voices`, {
    headers: { 'xi-api-key': API_KEY },
  });
  if (!res.ok) throw new Error(`Failed to list voices: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.voices;
}

async function generateSpeech(voiceId, text) {
  const res = await fetch(
    `${BASE_URL}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.8,
          style: 0.45,
          speed: 0.95,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS failed (${res.status}): ${err}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log('Fetching available voices...\n');
  const voices = await listVoices();

  const females = voices.filter(
    (v) => v.labels?.gender === 'female' && v.category === 'premade'
  );

  console.log('Available premade female voices:');
  females.forEach((v) =>
    console.log(`  ${v.name.padEnd(16)} ${v.voice_id}  ${JSON.stringify(v.labels || {})}`)
  );

  const voice =
    females.find((v) => /bella/i.test(v.name)) ||
    females.find((v) => /rachel/i.test(v.name)) ||
    females.find((v) => /charlotte/i.test(v.name)) ||
    females[0] ||
    voices[0];

  console.log(`\nUsing voice: ${voice.name} (${voice.voice_id})\n`);

  const voicesDir = path.resolve('voices');
  if (!fs.existsSync(voicesDir)) fs.mkdirSync(voicesDir);

  for (const animal of animals) {
    const text = `This is ${article(animal.name)} ${animal.name}!`;
    const filename = `${animal.num}-${animal.name.toLowerCase()}.mp3`;
    const filepath = path.join(voicesDir, filename);

    if (fs.existsSync(filepath)) {
      console.log(`✓ ${filename} (already exists, skipping)`);
      continue;
    }

    console.log(`Generating: "${text}" → ${filename}`);
    const audio = await generateSpeech(voice.voice_id, text);
    fs.writeFileSync(filepath, audio);
    console.log(`  Saved (${(audio.length / 1024).toFixed(1)} KB)`);

    await new Promise((r) => setTimeout(r, 400));
  }

  console.log('\nAll voice clips saved to ./voices/');
}

main().catch(console.error);
