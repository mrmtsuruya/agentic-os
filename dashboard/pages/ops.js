async function renderOps() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Operations</h1>
        <p class="page-subtitle">Decision-first command surface · outcome-driven missions · safe agent control</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary btn-sm" onclick="showNewMission()">+ New Mission</button>
        <button class="btn btn-ghost btn-sm" onclick="renderOps()">🔄 Refresh</button>
      </div>
    </div>
    <div id="briefBox"></div>
    <div class="page-header-left mt-3"><h3>🎯 Mission Board</h3><span class="page-subtitle">owner · intended result · confidence · next decision · escalation</span></div>
    <div id="missionBoard"><div class="loading"><div class="loading-spinner"></div></div></div>
    <div class="page-header-left mt-3"><h3>🛡 Agent Control</h3><span class="page-subtitle">autonomy limits · handoff · one-click intervention</span></div>
    <div id="agentControlBox"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;
  await loadBrief();
  await loadMissions();
  await loadAgentControl();
}

/* ── CEO Brief (decision-first) ── */
async function loadBrief() {
  const box = document.getElementById('briefBox');
  try {
    const b = await api.opsBrief();
    const s = b.summary || {};
    const tag = (c, label, color) => c ? `<span class="badge ${color}">${c} ${label}</span>` : '';
    const head = `<div class="card mb-3" style="border-left:3px solid var(--accent)">
      <div class="flex items-center justify-between mb-2">
        <span class="card-title">📋 CEO Brief — what needs your decision</span>
        <span class="flex gap-2">${tag(s.critical,'critical','badge-danger')}${tag(s.high,'high','badge-warning')}${tag(s.medium,'medium','badge-info')}${tag(s.low,'low','badge-neutral')}</span>
      </div>
      ${b.count === 0 ? '<div style="color:var(--text-muted);font-size:13px">✓ All clear. No decisions pending in the next 60 seconds.</div>'
        : `<ul style="list-style:none;padding:0;margin:0">${b.decisions.map(d => `
          <li class="brief-row sev-${d.severity}" onclick="briefJump('${d.kind}','${d.ref}')">
            <span class="badge badge-${d.severity==='critical'?'danger':d.severity==='high'?'warning':d.severity==='medium'?'info':'neutral'}">${d.severity}</span>
            <span style="flex:1"><b>${escapeHtml(d.title)}</b><br><span style="font-size:11px;color:var(--text-muted)">${escapeHtml(d.detail)}</span></span>
          </li>`).join('')}</ul>`}
    </div>`;
    box.innerHTML = head;
  } catch (e) {
    box.innerHTML = `<div class="empty-state"><div class="empty-state-title">${escapeHtml(e.message)}</div></div>`;
  }
}

function briefJump(kind, ref) {
  if (kind === 'blocked_mission' || kind === 'escalated_mission') navigate('ops');
  else if (kind.startsWith('agent')) navigate('ops');
  else if (kind === 'pending_publish') navigate('studio');
  showToast(`${kind}: ${ref}`, 'info');
}

/* ── Mission Board (outcome-driven) ── */
async function loadMissions() {
  const box = document.getElementById('missionBoard');
  try {
    const r = await api.opsMissions();
    const ms = r.missions || [];
    const conf = c => `<span class="badge ${c>=0.7?'badge-success':c>=0.4?'badge-warning':'badge-danger'}">conf ${(c*100).toFixed(0)}%</span>`;
    const stat = st => `<span class="badge ${st==='done'?'badge-success':st==='blocked'?'badge-danger':st==='escalated'?'badge-warning':'badge-info'}">${st}</span>`;
    box.innerHTML = ms.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px">${ms.map(m => `
      <div class="card mission-card" data-status="${m.status}">
        <div class="flex items-center justify-between mb-1">
          <span class="card-title">${escapeHtml(m.title)}</span>${stat(m.status)}
        </div>
        <div class="flex gap-2 mb-2"><span class="badge badge-neutral">👤 ${escapeHtml(m.owner||'unassigned')}</span>${conf(m.confidence)}</div>
        <div style="font-size:12px;margin-bottom:6px"><b>Intended:</b> ${escapeHtml(m.intended_result||'—')}</div>
        <div style="font-size:12px;margin-bottom:6px"><b>Next decision:</b> ${escapeHtml(m.next_decision||'—')}</div>
        <div style="font-size:12px;margin-bottom:8px"><b>Escalate to:</b> ${escapeHtml(m.escalation||'—')}</div>
        <div class="flex gap-2">
          <button class="btn btn-sm" onclick="missionHandoff('${m.id}')">🔁 Handoff</button>
          <button class="btn btn-sm" onclick="missionIntervene('${m.id}','${m.status==='blocked'?'resume':'pause'}')">${m.status==='blocked'?'▶ Resume':'⏸ Pause'}</button>
          <button class="btn btn-sm" onclick="missionIntervene('${m.id}','escalate')">⚠ Escalate</button>
        </div>
      </div>`).join('')}</div>` : `<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-title">No missions yet</div><div class="empty-state-desc">Create an outcome-driven mission with owner, confidence, and escalation.</div></div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty-state"><div class="empty-state-title">${escapeHtml(e.message)}</div></div>`;
  }
}

async function showNewMission() {
  const title = prompt('Mission title (business outcome):');
  if (!title) return;
  const owner = prompt('Owner (agent or person):', 'opencode') || '';
  const intended = prompt('Intended result:', '') || '';
  const conf = parseFloat(prompt('Confidence 0-1:', '0.5') || '0.5');
  const next = prompt('Next decision:', '') || '';
  const esc = prompt('Escalation path:', '') || '';
  try {
    await api.opsCreateMission({ title, owner, intended_result: intended, confidence: conf, next_decision: next, escalation: esc });
    showToast('Mission created', 'success');
    loadMissions(); loadBrief();
  } catch (e) { showToast(e.message, 'error'); }
}

async function missionHandoff(id) {
  const to = prompt('Reassign owner to:');
  if (!to) return;
  try { await api.opsHandoff(id, { to }); showToast('Handoff → ' + to, 'success'); loadMissions(); loadBrief(); }
  catch (e) { showToast(e.message, 'error'); }
}

async function missionIntervene(id, action) {
  if (!confirm(`${action} this mission?`)) return;
  try { await api.opsIntervene(id, { action }); showToast(action, 'success'); loadMissions(); loadBrief(); }
  catch (e) { showToast(e.message, 'error'); }
}

/* ── Agent Control ── */
async function loadAgentControl() {
  const box = document.getElementById('agentControlBox');
  try {
    const r = await api.opsAgentControl();
    box.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${r.agents.map(a => `
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <span class="card-title">${escapeHtml(a.name)}</span>
          <span class="badge ${a.status==='online'?'badge-success':a.status==='needs_auth'?'badge-warning':'badge-danger'}">${a.status}</span>
        </div>
        <div class="flex gap-2 mb-2 align-center">
          <span style="font-size:11px;color:var(--text-muted)">Autonomy:</span>
          <select id="aut_${a.name}" class="form-select" style="width:auto" onchange="setAutonomy('${a.name}')">
            ${['autonomous','manual','elevated'].map(o=>`<option ${a.autonomy===o?'selected':''}>${o}</option>`).join('')}
          </select>
          <span class="badge ${a.paused?'badge-danger':'badge-success'}">${a.paused?'PAUSED':'live'}</span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-sm" onclick="togglePause('${a.name}', ${a.paused})">${a.paused?'▶ Resume':'⏸ Pause'}</button>
        </div>
      </div>`).join('')}</div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty-state"><div class="empty-state-title">${escapeHtml(e.message)}</div></div>`;
  }
}

async function setAutonomy(name) {
  const v = document.getElementById('aut_' + name).value;
  try { await api.opsSetAgentControl(name, { autonomy: v }); showToast(`${name} autonomy → ${v}`, 'success'); }
  catch (e) { showToast(e.message, 'error'); }
}

async function togglePause(name, paused) {
  try { await api.opsSetAgentControl(name, { paused: !paused }); showToast(`${name} ${!paused?'paused':'resumed'}`, 'success'); loadAgentControl(); loadBrief(); }
  catch (e) { showToast(e.message, 'error'); }
}
