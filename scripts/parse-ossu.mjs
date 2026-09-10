import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(root, 'computer-science');
const readmePath = path.join(sourceRoot, 'README.md');
if (!fs.existsSync(readmePath)) {
  throw new Error('Missing computer-science/README.md. Clone with: gh repo clone https://github.com/ossu/computer-science.git computer-science');
}

const markdown = fs.readFileSync(readmePath, 'utf8');
const lines = markdown.split(/\r?\n/);
const clean = (value = '') => value.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/[()*`]/g, '').replace(/\s+/g, ' ').trim();
const slug = value => clean(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normalize = value => clean(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const links = value => [...value.matchAll(/\[([^\]]+)\]\(([^\)]+)\)/g)].map(([, label, url]) => ({ label, url }));

function provider(url) {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return 'OSSU'; }
  if (host.includes('coursera.org') || host.includes('deeplearning.ai')) return 'Coursera';
  if (host.includes('edx.org')) return 'edX';
  if (host.includes('mit.edu')) return 'MIT OpenCourseWare';
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
  if (host.includes('github.com')) return 'GitHub';
  if (host.includes('fullstackopen.com')) return 'Full Stack Open';
  if (host.includes('harvard.edu')) return 'Harvard';
  if (host.includes('washington.edu')) return 'University of Washington';
  if (host.includes('neu.edu')) return 'Northeastern University';
  if (host.includes('umass.edu')) return 'UMass Amherst';
  if (host.includes('ucsd.edu')) return 'UC San Diego';
  if (host.includes('upenn.edu')) return 'University of Pennsylvania';
  if (host.includes('rug.nl')) return 'University of Groningen';
  if (host.includes('timroughgarden.org')) return 'Stanford / Tim Roughgarden';
  if (host.includes('openlogicproject.org')) return 'Open Logic Project';
  if (host.includes('modernrobotics.northwestern.edu')) return 'Northwestern University';
  if (host.includes('wisc.edu')) return 'University of Wisconsin';
  if (host.includes('linuxfoundation.org')) return 'Linux Foundation';
  return host.split('.').slice(-2, -1)[0]?.replace(/(^|-)\w/g, m => m.toUpperCase()) || host;
}

function resolveUrl(rawUrl) {
  if (/^https?:/.test(rawUrl)) return rawUrl;
  const localCourseUrls = {
    'coursepages/intro-cs/README.md': 'https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/material-by-lecture/',
    'coursepages/spd/README.md': 'https://learning.edx.org/course/course-v1:UBCx+SPD1x+2T2015',
    'coursepages/class-based/README.md': 'https://course.ccs.neu.edu/cs2510sp22/index.html',
    'coursepages/ostep/README.md': 'https://pages.cs.wisc.edu/~remzi/OSTEP/'
  };
  if (localCourseUrls[rawUrl]) return localCourseUrls[rawUrl];
  const local = path.resolve(sourceRoot, rawUrl.split('#')[0]);
  if (!fs.existsSync(local)) return `https://github.com/ossu/computer-science/blob/master/${rawUrl}`;
  const body = fs.readFileSync(local, 'utf8');
  const candidates = links(body).map(x => x.url).filter(url => /^https?:/.test(url) && !/(discord|github\.com\/ossu|ossu\.dev)/.test(url));
  return candidates[0] || `https://github.com/ossu/computer-science/blob/master/${rawUrl}`;
}

let section = '';
let subsection = '';
const rows = [];
for (let i = 0; i < lines.length; i++) {
  const heading = lines[i].match(/^(##|###)\s+(.+)/);
  if (heading) {
    if (heading[1] === '##') { section = clean(heading[2]); subsection = ''; }
    else subsection = clean(heading[2]);
  }
  if (!/^Courses\s*\|/.test(lines[i])) continue;
  const headers = lines[i].split('|').map(clean);
  i += 2;
  while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
    const cells = lines[i].split('|').map(x => x.trim());
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    const courseLink = links(record.Courses)[0];
    if (courseLink) {
      const url = resolveUrl(courseLink.url);
      rows.push({
        id: slug(courseLink.label),
        title: courseLink.label,
        section,
        category: subsection || section,
        duration: clean(record.Duration) || 'Self-paced',
        effort: clean(record.Effort) || 'Flexible',
        prerequisiteText: clean(record.Prerequisites).replace(/^[-–]$/, 'None') || 'None',
        url,
        platform: provider(url),
        sourceUrl: courseLink.url
      });
    }
    i++;
  }
  i--;
}

// OSSU presents Systematic Program Design as one row, but the recommended
// archived offering is three sequential edX courses.
const spdIndex = rows.findIndex(row => row.title === 'Systematic Program Design');
if (spdIndex >= 0) {
  const original = rows[spdIndex];
  const parts = [
    { number: 1, url: 'https://learning.edx.org/course/course-v1:UBCx+SPD1x+2T2015/home' },
    { number: 2, url: 'https://learning.edx.org/course/course-v1:UBCx+SPD2x+2T2015/home' },
    { number: 3, url: 'https://learning.edx.org/course/course-v1:UBCx+SPD3x+3T2015/home' }
  ].map(({ number, url }) => ({
    ...original,
    id: `systematic-program-design-part-${number}`,
    title: `Systematic Program Design - Part ${number}`,
    duration: `Part ${number} of 3`,
    prerequisiteText: number === 1 ? original.prerequisiteText : `Systematic Program Design - Part ${number - 1}`,
    url,
    platform: provider(url),
    sourceUrl: url
  }));
  rows.splice(spdIndex, 1, ...parts);
}

const aliases = new Map();
for (const row of rows) {
  const names = [row.title, row.title.replace(/^Build a Modern Computer from First Principles:\s*/i, '')];
  const numberedPrefix = row.title.match(/^((?:Calculus|Computation Structures)\s+\d+[A-C]?)/i)?.[1];
  if (numberedPrefix) names.push(numberedPrefix);
  if (row.title.includes('Nand to Tetris')) names.push(row.title.includes('Part II') ? 'Nand to Tetris Part II' : 'From Nand to Tetris Part I');
  if (row.title.includes('Algorithms: Design and Analysis, Part 1')) names.push('Algorithms Part 1');
  if (row.id === 'systematic-program-design-part-3') names.push('Systematic Program Design', 'SPD');
  for (const name of names) if (name.length > 3) aliases.set(normalize(name), row.id);
}

for (const row of rows) {
  const text = normalize(row.prerequisiteText);
  const namedCourses = [...aliases.entries()]
    .filter(([name, id]) => id !== row.id && text.includes(name))
    .map(([, id]) => id);
  const categoryCourses = [...new Set(rows.map(course => course.category))]
    .filter(category => text.includes(normalize(category)))
    .flatMap(category => rows.filter(course => course.category === category && course.id !== row.id).map(course => course.id));
  row.prerequisiteIds = [...new Set([...namedCourses, ...categoryCourses])];
  row.requiresCore = row.section === 'Advanced CS' || row.section === 'Final project';
}

// Ambiguous natural-language prerequisites need curriculum-aware decisions.
// These override substring matches that happen to resemble course titles.
const curatedPrerequisites = {
  'systematic-program-design-part-1': [],
  'systematic-program-design-part-2': ['systematic-program-design-part-1'],
  'systematic-program-design-part-3': ['systematic-program-design-part-2'],
  'build-a-modern-computer-from-first-principles-nand-to-tetris-part-ii': ['build-a-modern-computer-from-first-principles-from-nand-to-tetris'],
  'computer-networking-a-top-down-approach': [],
  'computer-graphics': [],
  'computation-structures-1-digital-circuits': ['build-a-modern-computer-from-first-principles-nand-to-tetris-part-ii'],
  'theory-of-computation': ['mathematics-for-computer-science', 'algorithms-design-and-analysis-part-2'],
  'computational-geometry': ['algorithms-design-and-analysis-part-2'],
  'secure-software-development-implementation': ['secure-software-development-requirements-design-and-reuse'],
  'probability': ['calculus-1b-integration']
};
for (const [courseId, prerequisiteIds] of Object.entries(curatedPrerequisites)) {
  const course = rows.find(row => row.id === courseId);
  if (course) course.prerequisiteIds = prerequisiteIds;
}

// Upstream provider links that now redirect to a generic landing page.
const currentCourseUrls = {
  'secure-software-development-requirements-design-and-reuse': 'https://training.linuxfoundation.org/training/developing-secure-software-lfd121/',
  'secure-software-development-implementation': 'https://training.linuxfoundation.org/training/developing-secure-software-lfd121/',
  'secure-software-development-verification-and-more-specialized-topics': 'https://training.linuxfoundation.org/training/developing-secure-software-lfd121/'
};
for (const [courseId, url] of Object.entries(currentCourseUrls)) {
  const course = rows.find(row => row.id === courseId);
  if (course) { course.url = url; course.platform = provider(url); }
}

const securityElectives = [
  'identifying-security-vulnerabilities-in-c-c-programming',
  'exploiting-and-securing-vulnerabilities-in-java-applications'
];
for (const row of rows) {
  row.electiveGroup = securityElectives.includes(row.id) ? 'core-security-choice' : null;
  if (row.prerequisiteText.toLowerCase().includes('core security')) {
    row.prerequisiteIds = row.prerequisiteIds.filter(id => !securityElectives.includes(id));
    row.anyOfPrerequisiteIds = securityElectives;
  } else {
    row.anyOfPrerequisiteIds = [];
  }
}

// Completing Core CS is a global gate for Advanced CS and Final Project.
// Do not repeat Core courses as per-course dependencies in those phases.
const coreCourseIds = new Set(rows.filter(row => row.section === 'Core CS').map(row => row.id));
for (const row of rows.filter(row => row.requiresCore)) {
  row.prerequisiteIds = row.prerequisiteIds.filter(id => !coreCourseIds.has(id));
  row.anyOfPrerequisiteIds = row.anyOfPrerequisiteIds.filter(id => !coreCourseIds.has(id));
}

// Keep the complete prerequisite set for locking, while omitting visually
// redundant ancestor edges from the map (transitive reduction).
const byId = new Map(rows.map(course => [course.id, course]));
function transitivelyDependsOn(courseId, prerequisiteId, visited = new Set()) {
  if (visited.has(courseId)) return false;
  visited.add(courseId);
  const course = byId.get(courseId);
  if (!course) return false;
  if (course.prerequisiteIds.includes(prerequisiteId)) return true;
  return course.prerequisiteIds.some(id => transitivelyDependsOn(id, prerequisiteId, visited));
}
for (const row of rows) {
  row.edgePrerequisiteIds = row.prerequisiteIds.filter(prerequisiteId =>
    !row.prerequisiteIds.some(otherId => otherId !== prerequisiteId && transitivelyDependsOn(otherId, prerequisiteId))
  );
  row.edgePrerequisiteIds.push(...row.anyOfPrerequisiteIds);
}

const output = {
  generatedAt: new Date().toISOString(),
  source: 'https://github.com/ossu/computer-science',
  courses: rows
};
fs.mkdirSync(path.join(root, 'src', 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src', 'data', 'curriculum.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`Parsed ${rows.length} courses across ${new Set(rows.map(x => x.category)).size} categories.`);
