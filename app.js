async function main() {
  let reports = [];
  try {
    const res = await fetch('data/reports.json');
    reports = await res.json();
  } catch (e) {
    console.error('Failed to load reports.json', e);
  }

  render(reports, '');
  document.getElementById('search').addEventListener('input', (e) => {
    render(reports, e.target.value.trim().toLowerCase());
  });
}

function groupKey(r) {
  return (r.pattern && r.pattern !== 'None') ? r.pattern : `${r.problem} (no pattern)`;
}

function matches(r, q) {
  if (!q) return true;
  const haystack = [r.pattern, r.problem, r.level, r.summary, ...(r.stuck || []), ...(r.mistakes || []), ...(r.suggestions || [])]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function highlight(text, q) {
  const escaped = escapeHtml(text || '');
  if (!q) return escaped;
  const idx = escaped.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escaped;
  return escaped.slice(0, idx) + '<mark>' + escaped.slice(idx, idx + q.length) + '</mark>' + escaped.slice(idx + q.length);
}

function renderSection(title, items, query) {
  if (!items || items.length === 0) return '';
  return `<div class="session-section"><h4>${title}</h4><ul>${items.map((i) => `<li>${highlight(i, query)}</li>`).join('')}</ul></div>`;
}

function renderSession(s, query) {
  const el = document.createElement('div');
  el.className = 'session';
  el.innerHTML = `
    <div class="session-head">
      <span class="session-problem">${highlight(s.problem, query)}</span>
      <span class="badge ${s.type === 'lesson' ? 'lesson' : 'drill'}">${escapeHtml(s.type || 'drill')}</span>
      ${s.level ? `<span class="badge level">${escapeHtml(s.level)}</span>` : ''}
      <span class="session-date">${escapeHtml(s.date || '')}</span>
    </div>
    <div class="session-summary">${highlight(s.summary, query)}</div>
    ${renderSection('Stuck on', s.stuck, query)}
    ${renderSection('Mistakes', s.mistakes, query)}
    ${renderSection('Suggestions', s.suggestions, query)}
  `;
  return el;
}

function render(reports, query) {
  const container = document.getElementById('groups');
  const emptyState = document.getElementById('empty-state');
  const filtered = reports.filter((r) => matches(r, query));
  container.innerHTML = '';

  if (reports.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = 'No sessions logged yet.';
    return;
  }
  if (filtered.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = 'No sessions match your search.';
    return;
  }
  emptyState.hidden = true;

  const groups = new Map();
  for (const r of filtered) {
    const key = groupKey(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  for (const key of sortedKeys) {
    const sessions = groups.get(key).sort((a, b) => b.date.localeCompare(a.date));
    const groupEl = document.createElement('div');
    groupEl.className = 'group';

    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `<span class="group-title">${escapeHtml(key)}</span><span class="group-count">${sessions.length} session${sessions.length > 1 ? 's' : ''}</span>`;
    header.addEventListener('click', () => groupEl.classList.toggle('collapsed'));
    groupEl.appendChild(header);

    const body = document.createElement('div');
    body.className = 'group-body';
    for (const s of sessions) body.appendChild(renderSession(s, query));
    groupEl.appendChild(body);

    container.appendChild(groupEl);
  }
}

main();
