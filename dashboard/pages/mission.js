async function renderMission() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Mission Control</h1>
        <p class="page-subtitle">Per-agent status · active/done tasks · issues · cost — live from registry + Kanban</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-ghost" onclick="renderMission()">🔄 Refresh</button>
      </div>
    </div>
    <div id="missionTotals" class="flex gap-2 mb-3"></div>
    <div id="missionGrid"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;
  await loadMission();
}

async function loadMission() {
  const grid = document.getElementById('missionGrid');
  const totals = document.getElementById('missionTotals');
  try {
    const r = await api.missionOverview();
    const t = r.totals || {};
    totals.innerHTML = `
      <span class="badge badge-success">${t.online || 0} online</span>
      <span class="badge badge-info">${t.active || 0} active</span>
      <span class="badge badge-success">${t.done || 0} done</span>
      <span class="badge badge-danger">${t.issues || 0} issues</span>`;
    grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px">${r.agents.map(a => {
      const col = a.status === 'online' ? 'badge-success' : (a.status === 'needs_auth' ? 'badge-warning' : 'badge-danger');
      const lab = a.status === 'online' ? 'ONLINE' : (a.status === 'needs_auth' ? 'NEEDS AUTH' : 'MISSING');
      const active = (a.active_tasks || []).map(x => `<li style="font-size:11px;color:var(--text-muted)">▸ ${escapeHtml(x.title)} <span class="badge badge-info" style="margin-left:4px">${x.status}</span></li>`).join('') || '<li style="font-size:11px;color:var(--text-muted)">—</li>';
      const done = (a.done_tasks || []).map(x => `<li style="font-size:11px;color:var(--text-muted)">✓ ${escapeHtml(x.title)}</li>`).join('') || '<li style="font-size:11px;color:var(--text-muted)">—</li>';
      return `<div class="card">
        <div class="flex items-center justify-between mb-2">
          <span class="card-title">${escapeHtml(a.label)}</span>
          <span class="badge ${col}">${lab}</span>
        </div>
        <div class="flex gap-2" style="margin-bottom:8px">
          <span class="badge badge-info">⚙ ${a.active} active</span>
          <span class="badge badge-success">✓ ${a.done} done</span>
          <span class="badge badge-danger">⚠ ${a.issues} issues</span>
          <span class="badge badge-neutral">💲 $${a.spent.toFixed(2)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div style="font-size:11px;font-weight:600;margin-bottom:4px">Active</div><ul style="list-style:none;padding:0;margin:0">${active}</ul></div>
          <div><div style="font-size:11px;font-weight:600;margin-bottom:4px">Done</div><ul style="list-style:none;padding:0;margin:0">${done}</ul></div>
        </div>
      </div>`;
    }).join('')}</div>`;
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}
