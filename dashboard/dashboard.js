(() => {
  const state = { data: null, role: 'director', service: 'All', room: 'All', day: 'All', timeframe: 13, sort: 'date', reviewed: new Set() };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const pct = (value) => `${Number(value).toFixed(1)}%`;

  async function load() {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('Synthetic data fixture could not be loaded.');
    state.data = await response.json();
    bind();
    render();
  }

  function bind() {
    $$('.role-button').forEach((button) => button.addEventListener('click', () => setRole(button.dataset.role)));
    $('#timeframeFilter').addEventListener('change', (event) => { state.timeframe = Number(event.target.value); render(); });
    $('#serviceFilter').addEventListener('change', (event) => { state.service = event.target.value; render(); });
    $('#roomFilter').addEventListener('change', (event) => { state.room = event.target.value; render(); });
    $$('.demo-step').forEach((button) => button.addEventListener('click', () => runDemo(Number(button.dataset.demo))));
    $$('[data-sort]').forEach((button) => button.addEventListener('click', () => { state.sort = button.dataset.sort; renderCases(); }));
    $('#csvButton').addEventListener('click', downloadCsv);
    $('#caseRows').addEventListener('click', handleCaseClick);
    $('#drawerClose').addEventListener('click', closeDrawer);
    $('#printButton').addEventListener('click', () => print());
    $('#aboutButton').addEventListener('click', () => $('#aboutDialog').showModal());
    $('#aboutClose').addEventListener('click', () => $('#aboutDialog').close());
    addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  }

  function setRole(role) {
    state.role = role;
    $$('.role-button').forEach((button) => button.classList.toggle('is-active', button.dataset.role === role));
    if (role === 'director') $('.trend-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (role === 'manager') $('.reason-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (role === 'scheduling') $('#casePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function runDemo(step) {
    $$('.demo-step').forEach((button) => button.classList.toggle('is-active', Number(button.dataset.demo) === step));
    const narrative = $('#demoNarrative');
    state.day = 'All';
    if (step === 1) {
      state.service = 'All'; state.room = 'All'; state.timeframe = 13; setRole('director');
      narrative.textContent = 'Start with the 13-week program view. A recent Service B change warrants a closer look.';
    } else if (step === 2) {
      state.service = 'Service B'; state.room = 'All'; state.timeframe = 13; setRole('manager');
      narrative.textContent = 'Service B is above the illustrative expected range. Check where the recorded variance concentrates.';
    } else {
      state.service = 'Service B'; state.room = 'All'; state.day = 'Tuesday'; state.timeframe = 13; setRole('scheduling');
      narrative.textContent = 'Tuesday and “bed availability” account for much of the synthetic pattern. Review selected records with their operational owners.';
    }
    $('#serviceFilter').value = state.service; $('#roomFilter').value = state.room; $('#timeframeFilter').value = String(state.timeframe);
    render();
  }

  function currentKpis() {
    if (state.service !== 'All') return state.data.services.find((item) => item.name === state.service);
    const services = state.data.services;
    return {
      rate: services.reduce((sum, item) => sum + item.rate, 0) / services.length,
      start: services.reduce((sum, item) => sum + item.start, 0) / services.length,
      utilization: services.reduce((sum, item) => sum + item.utilization, 0) / services.length,
      completed: services.reduce((sum, item) => sum + item.completed, 0)
    };
  }

  function render() {
    const kpis = currentKpis();
    $('#kpiCancellation').textContent = pct(kpis.rate);
    $('#kpiStart').textContent = `${Math.round(kpis.start)}%`;
    $('#kpiUtilization').textContent = `${Math.round(kpis.utilization)}%`;
    $('#kpiCompleted').textContent = kpis.completed.toLocaleString('en-CA');
    $('#kpiCancellationContext').textContent = state.service === 'All' ? 'Synthetic expected range: 4–6%' : `${state.service} · synthetic expected range: 4–6%`;
    $('#kpiCompletedContext').textContent = `${state.timeframe}-week illustrative volume`;
    renderTrend(); renderServices(); renderReasons(); renderWeekdays(); renderCases();
  }

  function renderTrend() {
    const weeks = state.data.weeks.slice(-state.timeframe);
    const multiplier = state.service === 'Service B' ? 1.28 : state.service === 'All' ? 1 : .88 + state.data.services.findIndex((item) => item.name === state.service) * .02;
    $('#trendChart').innerHTML = weeks.map((week) => {
      const rate = Math.min(10.5, week.rate * multiplier);
      return `<div class="trend-bar ${rate > 6 ? 'is-high' : ''}" style="height:${rate * 9}%" title="${week.label}: ${pct(rate)}"><span>${pct(rate)}</span><small>${week.label}</small></div>`;
    }).join('');
  }

  function renderServices() {
    $('#serviceBreakdown').innerHTML = state.data.services.map((item) => `<button class="bar-button ${state.service === item.name ? 'is-active' : ''}" data-service="${item.name}" type="button"><span class="bar-label"><span>${item.name}</span><b>${pct(item.rate)}</b></span><span class="bar-track"><span class="bar-fill" style="width:${item.rate * 8.5}%"></span></span></button>`).join('');
    $$('#serviceBreakdown [data-service]').forEach((button) => button.addEventListener('click', () => { state.service = button.dataset.service; $('#serviceFilter').value = state.service; render(); }));
  }

  function renderReasons() {
    const serviceB = state.service === 'Service B';
    $('#reasonScope').textContent = state.service === 'All' ? 'All services' : state.service;
    $('#reasonBreakdown').innerHTML = state.data.reasons.map((item) => { const value = serviceB ? item.serviceB : item.all; return `<div class="reason-row"><span class="bar-label"><span>${item.name}</span><b>${value}%</b></span><span class="bar-track"><span class="bar-fill" style="width:${value * 2}%"></span></span></div>`; }).join('');
  }

  function renderWeekdays() {
    $('#weekdayBreakdown').innerHTML = state.data.weekdays.map((item) => `<button class="weekday-button ${state.day === item.name ? 'is-active' : ''}" data-day="${item.name}" type="button"><span>${item.name.slice(0,3)}</span><strong>${pct(item.rate + (state.service === 'Service B' && item.name === 'Tuesday' ? 2.1 : 0))}</strong></button>`).join('');
    $$('#weekdayBreakdown [data-day]').forEach((button) => button.addEventListener('click', () => { state.day = state.day === button.dataset.day ? 'All' : button.dataset.day; renderWeekdays(); renderCases(); }));
    const rooms = Array.from({length:8}, (_, index) => `OR ${index + 1}`);
    const days = ['Mon','Tue','Wed','Thu','Fri'];
    let cells = '<span></span>' + rooms.map((room) => `<span class="heatmap-label">${room}</span>`).join('');
    days.forEach((day, dayIndex) => { cells += `<span class="heatmap-label">${day}</span>`; rooms.forEach((room, roomIndex) => { const high = dayIndex === 1 && [1,4,7].includes(roomIndex); const medium = (dayIndex + roomIndex) % 4 === 0; cells += `<span class="heatmap-cell ${high ? 'high' : medium ? 'medium' : ''}">${high ? '●●●' : medium ? '●●' : '●'}</span>`; }); });
    $('#heatmap').innerHTML = cells;
  }

  function filteredCases() {
    return state.data.cases.filter((item) => (state.service === 'All' || item.service === state.service) && (state.room === 'All' || item.room === state.room) && (state.day === 'All' || item.day === state.day)).sort((a,b) => String(a[state.sort]).localeCompare(String(b[state.sort])));
  }

  function renderCases() {
    const cases = filteredCases();
    $('#caseCount').textContent = `${cases.length} synthetic case${cases.length === 1 ? '' : 's'}`;
    $('#caseRows').innerHTML = cases.length ? cases.map((item) => { const reviewed = state.reviewed.has(item.id) || item.status === 'Reviewed'; return `<tr><td><button class="row-button" data-open="${item.id}" type="button">${item.id}</button></td><td>${item.date}</td><td>${item.service}</td><td>${item.room}</td><td>${item.day}</td><td>${item.reason}</td><td><span class="status-pill ${reviewed ? 'reviewed' : ''}">${reviewed ? 'Reviewed' : 'Needs review'}</span></td><td><button class="row-button" data-review="${item.id}" type="button">${reviewed ? 'Undo' : 'Mark reviewed'}</button></td></tr>`; }).join('') : '<tr><td colspan="8">No synthetic cases match the selected filters.</td></tr>';
  }

  function handleCaseClick(event) {
    const open = event.target.closest('[data-open]'); const review = event.target.closest('[data-review]');
    if (open) openDrawer(open.dataset.open);
    if (review) { state.reviewed.has(review.dataset.review) ? state.reviewed.delete(review.dataset.review) : state.reviewed.add(review.dataset.review); renderCases(); }
  }

  function openDrawer(id) {
    const item = state.data.cases.find((entry) => entry.id === id);
    $('#drawerTitle').textContent = item.id;
    $('#drawerBody').innerHTML = `<dl><dt>Date</dt><dd>${item.date}</dd><dt>Service</dt><dd>${item.service}</dd><dt>Room</dt><dd>${item.room}</dd><dt>Day</dt><dd>${item.day}</dd><dt>Recorded reason</dt><dd>${item.reason}</dd><dt>Follow-up</dt><dd>Validate the recorded reason and operational context with the case owner.</dd></dl>`;
    $('#caseDrawer').classList.add('is-open'); $('#caseDrawer').setAttribute('aria-hidden','false'); $('#drawerClose').focus();
  }
  function closeDrawer() { $('#caseDrawer').classList.remove('is-open'); $('#caseDrawer').setAttribute('aria-hidden','true'); }

  function downloadCsv() {
    const rows = [['Case ID','Date','Service','Room','Day','Recorded reason','Status'], ...filteredCases().map((item) => [item.id,item.date,item.service,item.room,item.day,item.reason,state.reviewed.has(item.id) ? 'Reviewed' : item.status])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); link.download = 'synthetic-or-cases.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  load().catch((error) => { document.querySelector('main').innerHTML = `<p class="panel">${error.message}</p>`; });
})();
