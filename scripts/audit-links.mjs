import curriculum from '../src/data/curriculum.json' with { type: 'json' };

let cursor = 0;
const results = [];
async function worker() {
  while (cursor < curriculum.courses.length) {
    const index = cursor++;
    const course = curriculum.courses[index];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(course.url, {
        redirect: 'follow', signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 OSSU-Path-Link-Audit' }
      });
      results[index] = { course, status: response.status, finalUrl: response.url, ok: response.ok };
    } catch (error) {
      results[index] = { course, status: 'ERR', finalUrl: course.url, ok: false, error: error.name };
    } finally { clearTimeout(timeout); }
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
for (const result of results) {
  const redirect = result.finalUrl !== result.course.url ? ` -> ${result.finalUrl}` : '';
  console.log(`${result.status}\t${result.course.title}${redirect}`);
}
const failures = results.filter(result => !result.ok);
console.log(`\nChecked ${results.length} course links; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
