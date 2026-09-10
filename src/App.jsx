import { useCallback, useEffect, useMemo, useState } from 'react';
import { Background, Controls, Handle, MiniMap, Position, ReactFlow } from '@xyflow/react';
import curriculum from './data/curriculum.json';

const COMPLETED_KEY = 'ossu-path:completed:v1';
const PATH_KEY = 'ossu-path:selected-path:v1';
const sectionColor = { 'Intro CS': '#f5c65b', 'Core CS': '#73d8ad', 'Advanced CS': '#b8a5ff', 'Final project': '#ff927c' };
const geospatialPreset = [
  'parallel-programming', 'software-debugging', 'software-testing', 'computational-geometry',
  'web-security-fundamentals', 'secure-software-development-requirements-design-and-reuse',
  'secure-software-development-implementation', 'secure-software-development-verification-and-more-specialized-topics',
  'essence-of-linear-algebra', 'linear-algebra', 'introduction-to-numerical-methods', 'probability',
  'fullstack-open', 'data-mining-specialization', 'big-data-specialization', 'cloud-computing-specialization',
  'data-science-specialization'
];

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key)) || []); } catch { return new Set(); }
}

function loadCompleted() {
  const saved = loadSet(COMPLETED_KEY);
  if (saved.delete('systematic-program-design')) {
    saved.add('systematic-program-design-part-1');
    saved.add('systematic-program-design-part-2');
    saved.add('systematic-program-design-part-3');
  }
  return saved;
}

function CourseNode({ data }) {
  return <div className={`course-node ${data.done ? 'is-done' : ''} ${data.locked ? 'is-locked' : ''}`}>
    <Handle type="target" position={Position.Left} />
    <div className="node-topline"><span className="category-dot" style={{ background: sectionColor[data.course.section] }} />{data.course.category}</div>
    <div className="course-link"><strong>{data.course.title}</strong></div>
    <div className="node-meta"><span>{data.course.platform}</span><span>{data.course.duration}</span></div>
    <label className="complete-toggle" onClick={event => event.stopPropagation()}>
      <input type="checkbox" checked={data.done} disabled={data.locked} onChange={() => data.onToggle(data.course.id)} />
      <span>{data.done ? 'Completed' : data.locked ? 'Prerequisites needed' : 'Mark complete'}</span>
    </label>
    <Handle type="source" position={Position.Right} />
  </div>;
}

const nodeTypes = { course: CourseNode };

function Toolbar({ phase, coreComplete, remainingCore, progress, onPhase, query, setQuery, onPlan, onReset }) {
  return <header className="toolbar">
    <div className="brand"><div className="brand-mark">O</div><div><h1>OSSU Path</h1><p>Your route through computer science</p></div></div>
    <div className="progress-wrap">
      <div className="progress-copy"><span>{phase === 'core' ? 'Core CS foundation' : 'Selected pathway'}</span><b>{progress.done} / {progress.total}</b></div>
      <div className="progress"><i style={{ width: `${progress.total ? progress.done / progress.total * 100 : 0}%` }} /></div>
    </div>
    <div className="filters">
      <div className="search"><span>⌕</span><input aria-label="Search courses" placeholder="Find a course…" value={query} onChange={e => setQuery(e.target.value)} /></div>
      {phase === 'advanced' && <button className="plan-button" onClick={onPlan}>Plan pathway</button>}
      <button className="reset" onClick={onReset}>Reset</button>
    </div>
    <nav className="phase-tabs" aria-label="Curriculum phase">
      <button className={phase === 'core' ? 'active' : ''} onClick={() => onPhase('core')}><span>01</span> Core foundation</button>
      <button className={phase === 'advanced' ? 'active' : ''} disabled={!coreComplete} onClick={() => onPhase('advanced')} title={coreComplete ? 'Open pathway' : `Complete ${remainingCore} more Core requirements`}><span>02</span> Advanced pathway {coreComplete ? '' : '🔒'}</button>
    </nav>
  </header>;
}

function PathPlanner({ courses, selected, onToggle, onPreset, onClear, onClose }) {
  const groups = [...new Set(courses.map(c => c.category))];
  return <div className="planner-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="planner">
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <p className="eyebrow">Build your specialization</p>
      <h2>Choose what is relevant to you</h2>
      <p className="planner-intro">OSSU Advanced CS is elective. Select the subjects that support your goals; their prerequisite courses are added automatically.</p>
      <div className="preset-card">
        <div><span>Recommended preset</span><strong>Geospatial Engineer</strong><p>Cloud data platforms, computational geometry, production ML foundations, and secure software delivery.</p></div>
        <button onClick={onPreset}>Use preset</button>
      </div>
      <div className="planner-actions"><b>{selected.size} courses selected</b><button onClick={onClear}>Clear selection</button></div>
      <div className="course-checklist">
        {groups.map(group => <div className="check-group" key={group}><h3>{group}</h3>{courses.filter(c => c.category === group).map(course =>
          <label key={course.id}><input type="checkbox" checked={selected.has(course.id)} onChange={() => onToggle(course.id)} /><span><b>{course.title}</b><small>{course.platform} · {course.duration}</small></span></label>
        )}</div>)}
      </div>
      <div className="planner-footer"><button onClick={onClose}>Show my pathway</button></div>
    </section>
  </div>;
}

function App() {
  const [completed, setCompleted] = useState(loadCompleted);
  const [pathSelection, setPathSelection] = useState(() => loadSet(PATH_KEY));
  const [phase, setPhase] = useState('core');
  const [query, setQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const coreCourses = useMemo(() => curriculum.courses.filter(c => c.section === 'Core CS'), []);
  const pathwayCourses = useMemo(() => curriculum.courses.filter(c => c.section === 'Advanced CS' || c.section === 'Final project'), []);
  const pathwayIds = useMemo(() => new Set(pathwayCourses.map(c => c.id)), [pathwayCourses]);
  const coreRequired = coreCourses.filter(c => !c.electiveGroup);
  const coreChoices = coreCourses.filter(c => c.electiveGroup === 'core-security-choice');
  const requiredDone = coreRequired.filter(c => completed.has(c.id)).length;
  const choiceDone = coreChoices.some(c => completed.has(c.id));
  const coreComplete = requiredDone === coreRequired.length && choiceDone;
  const remainingCore = coreRequired.length - requiredDone + (choiceDone ? 0 : 1);

  useEffect(() => localStorage.setItem(COMPLETED_KEY, JSON.stringify([...completed])), [completed]);
  useEffect(() => localStorage.setItem(PATH_KEY, JSON.stringify([...pathSelection])), [pathSelection]);
  useEffect(() => { if (!coreComplete && phase === 'advanced') setPhase('core'); }, [coreComplete, phase]);

  const onToggleComplete = useCallback(id => setCompleted(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; }), []);
  const addWithPrerequisites = useCallback(ids => {
    const next = new Set(ids.filter(id => pathwayIds.has(id)));
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of [...next]) {
        const course = curriculum.courses.find(c => c.id === id);
        for (const dependency of course?.prerequisiteIds || []) if (pathwayIds.has(dependency) && !next.has(dependency)) { next.add(dependency); changed = true; }
      }
    }
    return next;
  }, [pathwayIds]);
  const togglePathCourse = id => setPathSelection(previous => {
    if (!previous.has(id)) return addWithPrerequisites([...previous, id]);
    const next = new Set(previous); next.delete(id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const course of pathwayCourses) if (next.has(course.id) && course.prerequisiteIds.some(dep => !next.has(dep) && pathwayIds.has(dep))) { next.delete(course.id); changed = true; }
    }
    return next;
  });

  const isLocked = useCallback(course => {
    const missingRequired = course.prerequisiteIds.some(id => !completed.has(id));
    const missingChoice = course.anyOfPrerequisiteIds?.length > 0 && !course.anyOfPrerequisiteIds.some(id => completed.has(id));
    return missingRequired || missingChoice || (course.requiresCore && !coreComplete);
  }, [completed, coreComplete]);

  const phaseCourses = phase === 'core'
    ? curriculum.courses.filter(c => c.section === 'Intro CS' || c.section === 'Core CS')
    : pathwayCourses.filter(c => pathSelection.has(c.id));
  const visible = phaseCourses.filter(course => `${course.title} ${course.category} ${course.platform}`.toLowerCase().includes(query.toLowerCase()));

  const { nodes, edges } = useMemo(() => {
    const categories = [...new Set(phaseCourses.map(c => c.category))];
    const visibleIds = new Set(visible.map(c => c.id));
    const nodes = visible.map(course => {
      const categoryIndex = categories.indexOf(course.category);
      const siblings = phaseCourses.filter(c => c.category === course.category);
      const siblingIndex = siblings.findIndex(c => c.id === course.id);
      return { id: course.id, type: 'course', position: { x: categoryIndex * 360, y: siblingIndex * 205 + (categoryIndex % 2) * 65 }, data: { course, done: completed.has(course.id), locked: isLocked(course), onToggle: onToggleComplete } };
    });
    const edges = visible.flatMap(course => (course.edgePrerequisiteIds || course.prerequisiteIds).filter(id => visibleIds.has(id)).map(id => ({ id: `${id}-${course.id}`, source: id, target: course.id, animated: completed.has(id) && !completed.has(course.id), style: { stroke: completed.has(id) ? '#68d7a4' : '#3b5048', strokeWidth: 2 } })));
    return { nodes, edges };
  }, [phaseCourses, visible, completed, isLocked, onToggleComplete]);

  const activeCourse = curriculum.courses.find(c => c.id === selectedNode);
  const progress = phase === 'core'
    ? { done: requiredDone + (choiceDone ? 1 : 0), total: coreRequired.length + 1 }
    : { done: [...pathSelection].filter(id => completed.has(id)).length, total: pathSelection.size };

  return <main>
    <Toolbar phase={phase} coreComplete={coreComplete} remainingCore={remainingCore} progress={progress} onPhase={setPhase} query={query} setQuery={setQuery} onPlan={() => setPlannerOpen(true)} onReset={() => { if (confirm('Clear all course progress?')) setCompleted(new Set()); }} />
    <div className={`map-shell phase-${phase}`}>
      <div className="map-note"><span className="live-dot" /> {phase === 'core' ? `Core foundation · ${remainingCore} requirements remaining` : 'Your selected specialization'} · drag to explore</div>
      {phase === 'core' && <div className={`core-gate ${coreComplete ? 'ready' : ''}`}><span>{coreComplete ? '✓' : '02'}</span><div><b>{coreComplete ? 'Advanced pathway unlocked' : 'Advanced CS unlocks after Core'}</b><small>{coreComplete ? 'Choose the courses relevant to your goals.' : `${remainingCore} Core requirements remaining`}</small></div><button disabled={!coreComplete} onClick={() => { setPhase('advanced'); setPlannerOpen(pathSelection.size === 0); }}>Open pathway</button></div>}
      {phase === 'advanced' && pathSelection.size === 0 && <div className="empty-path"><div>✦</div><p className="eyebrow">Advanced CS unlocked</p><h2>Your pathway is ready to shape</h2><p>Advanced courses are electives. Choose only the subjects relevant to your goals, or begin with a career preset.</p><button onClick={() => setPlannerOpen(true)}>Choose my courses</button></div>}
      <ReactFlow key={`${phase}-${[...pathSelection].join('-')}`} nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={(_, node) => setSelectedNode(node.id)} fitView fitViewOptions={{ padding: .18 }} minZoom={.18} maxZoom={1.6} nodesDraggable={false} colorMode="dark" proOptions={{ hideAttribution: true }}>
        <Background color="#23332d" gap={28} size={1} /><Controls showInteractive={false} />
        {nodes.length > 0 && <MiniMap pannable zoomable nodeColor={node => sectionColor[node.data.course.section]} maskColor="rgba(5,12,10,.78)" />}
      </ReactFlow>
      <div className="legend">{Object.entries(sectionColor).filter(([name]) => phase === 'core' ? name.includes('Core') || name.includes('Intro') : name.includes('Advanced') || name.includes('Final')).map(([name, color]) => <span key={name}><i style={{ background: color }} />{name}</span>)}</div>
      {activeCourse && <aside className="detail-panel"><button className="close" onClick={() => setSelectedNode(null)} aria-label="Close">×</button><p className="eyebrow">{activeCourse.category}</p><h2>{activeCourse.title}</h2><div className="detail-grid"><span>Platform<b>{activeCourse.platform}</b></span><span>Duration<b>{activeCourse.duration}</b></span><span>Effort<b>{activeCourse.effort}</b></span></div><p className="eyebrow">Prerequisites</p><p className="prereqs">{activeCourse.requiresCore && activeCourse.prerequisiteIds.length === 0 ? 'Core CS completion' : activeCourse.prerequisiteText}</p><a href={activeCourse.url} target="_blank" rel="noreferrer">Open course <span>↗</span></a></aside>}
    </div>
    {plannerOpen && <PathPlanner courses={pathwayCourses} selected={pathSelection} onToggle={togglePathCourse} onPreset={() => setPathSelection(addWithPrerequisites(geospatialPreset))} onClear={() => setPathSelection(new Set())} onClose={() => setPlannerOpen(false)} />}
  </main>;
}

export default App;
