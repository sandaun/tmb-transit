#!/usr/bin/env node

/**
 * Samples the FGC train position dataset over time.
 *
 * Animating vehicle movement between polls is only correct if a vehicle id
 * identifies the same physical train across samples. The ids observed so far
 * look derived from the run rather than the unit, and the dataset carries no
 * timestamp, so this script gathers the evidence needed before building any
 * interpolation on top of it. Run it at peak hours — samples taken near the
 * end of service cannot tell a missing train from one that finished its run.
 *
 * Usage: node scripts/sample-fgc-vehicles.mjs [--minutes 10] [--interval 20] [--out file.jsonl]
 */

const DATASET_URL =
  'https://dadesobertes.fgc.cat/api/explore/v2.1/catalog/datasets/posicionament-dels-trens/records?limit=100';
const METERS_PER_LATITUDE_DEGREE = 111_320;

function parseArguments(argv) {
  const options = { minutes: 10, interval: 20, out: 'fgc-vehicle-samples.jsonl' };

  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index].replace(/^--/, '');
    const value = argv[index + 1];
    if (!(name in options) || value === undefined) {
      continue;
    }
    options[name] = name === 'out' ? value : Number(value);
    index += 1;
  }

  if (!Number.isFinite(options.minutes) || !Number.isFinite(options.interval)) {
    throw new Error('--minutes and --interval must be numbers');
  }

  return options;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function distanceMeters(first, second) {
  const averageLatitudeRadians = ((first.lat + second.lat) / 2) * (Math.PI / 180);
  const latitudeMeters = (second.lat - first.lat) * METERS_PER_LATITUDE_DEGREE;
  const longitudeMeters =
    (second.lon - first.lon) * METERS_PER_LATITUDE_DEGREE * Math.cos(averageLatitudeRadians);

  return Math.hypot(latitudeMeters, longitudeMeters);
}

async function fetchSample() {
  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`FGC dataset request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];

  return results.flatMap((record) => {
    const point = record?.geo_point_2d;
    if (!record?.id || typeof point?.lat !== 'number' || typeof point?.lon !== 'number') {
      return [];
    }

    return [{
      id: record.id,
      line: (record.lin ?? '').toUpperCase(),
      lat: point.lat,
      lon: point.lon,
      direction: record.dir ?? null,
      parkedAt: record.estacionat_a ?? null,
    }];
  });
}

function summarize(samples) {
  console.log('\n--- resum ---');
  console.log(`mostres: ${samples.length}`);

  const lineCounts = new Map();
  for (const sample of samples) {
    for (const vehicle of sample.vehicles) {
      lineCounts.set(vehicle.line, Math.max(lineCounts.get(vehicle.line) ?? 0, 1));
    }
  }

  console.log(
    `trens per mostra: ${samples.map((sample) => sample.vehicles.length).join(', ')}`,
  );
  console.log(`linies vistes: ${[...lineCounts.keys()].sort().join(', ') || 'cap'}`);

  console.log('\nsupervivencia d\'ids entre mostres consecutives:');
  for (let index = 1; index < samples.length; index += 1) {
    const previous = new Map(samples[index - 1].vehicles.map((v) => [v.id, v]));
    const current = samples[index].vehicles;
    const survivors = current.filter((vehicle) => previous.has(vehicle.id));
    const moved = survivors.filter(
      (vehicle) => distanceMeters(previous.get(vehicle.id), vehicle) > 5,
    );
    const gapSeconds = Math.round((samples[index].at - samples[index - 1].at) / 1000);
    const percent = current.length
      ? Math.round((survivors.length / current.length) * 100)
      : 0;

    console.log(
      `  ${index - 1}->${index} (${gapSeconds}s): ${survivors.length}/${current.length} ids sobreviuen (${percent}%), ${moved.length} s'han mogut >5 m`,
    );
  }

  const last = samples.at(-1);
  if (last) {
    const parked = last.vehicles.filter((vehicle) => vehicle.parkedAt).length;
    const withDirection = last.vehicles.filter((vehicle) => vehicle.direction).length;
    console.log(
      `\ndarrera mostra: ${parked}/${last.vehicles.length} estacionats, ${withDirection}/${last.vehicles.length} amb direccio`,
    );
  }
}

async function main() {
  const { minutes, interval, out } = parseArguments(process.argv.slice(2));
  const { appendFile, writeFile } = await import('node:fs/promises');
  const deadline = Date.now() + minutes * 60_000;
  const samples = [];

  await writeFile(out, '');
  console.log(`mostrejant ${minutes} min cada ${interval} s -> ${out}`);

  while (Date.now() < deadline) {
    try {
      const vehicles = await fetchSample();
      const sample = { at: Date.now(), vehicles };
      samples.push(sample);
      await appendFile(out, `${JSON.stringify(sample)}\n`);
      console.log(`[${new Date(sample.at).toISOString()}] ${vehicles.length} trens`);
    } catch (error) {
      console.error(`mostra fallida: ${error.message}`);
    }

    if (Date.now() + interval * 1_000 >= deadline) {
      break;
    }
    await wait(interval * 1_000);
  }

  summarize(samples);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
