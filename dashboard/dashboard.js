(() => {
  const state = { view: 'baseline', tab: 'patterns', openTooltip: null, aboutOpen: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let data;
  let returnFocusTo = null;

  const kpis = [
    { id:'cancel', label:'Same-Day Cancellation Rate', value:'6.8%', status:'▲ Above expected range', tone:'amber', context:'Baseline 5.1% · expected 4.5–5.6%', definition:'Booked cases cancelled on the scheduled day of surgery, as a share of cases booked for that day.', formula:'same-day cancellations ÷ cases booked × 100' },
    { id:'fcots', label:'First-Case On-Time Starts', value:'71%', status:'— Stable', tone:'slate', context:'Baseline 71%', definition:'First case of each session starting within the agreed grace period of its scheduled start.', formula:'on-time first cases ÷ first cases × 100' },
    { id:'util', label:'Staffed OR Utilization', value:'82%', status:'✓ In range', tone:'green', context:'Expected 78–88% (illustrative)', definition:'Time patients are in the room as a share of staffed session time.', formula:'in-room case minutes ÷ staffed session minutes × 100' },
    { id:'cases', label:'Completed Cases', value:'395', status:'— Stable', tone:'slate', context:'Baseline 400 · within ±3%', definition:'Cases with a recorded procedure end time in the period.', formula:'count of completed cases' }
  ];

  const briefs = {
    baseline: {
      signal:'Same-day cancellations have been above the expected range for 3 weeks: 6.8% vs a 5.1% baseline.',
      pattern:'Orthopaedics stands out at 10.0%, well above the other specialties.',
      limit:'Rates show where cancellations occur, not why they occur.',
      next:'Is the increase concentrated in Orthopaedics, and if so, where?'
    },
    orthopaedics: {
      signal:'Same-day cancellations have been above the expected range for 3 weeks: 6.8% vs a 5.1% baseline.',
      pattern:'Orthopaedics holds 12 of the program’s 29 cancellations; bed availability is the most frequent recorded reason (7 of 12).',
      limit:'Recorded reasons are entered at cancellation and are not clinically validated.',
      next:'Is the Orthopaedics concentration tied to particular days or sessions?'
    },
    tuesday: {
      signal:'Same-day cancellations have been above the expected range for 3 weeks: 6.8% vs a 5.1% baseline.',
      pattern:'Half of Orthopaedics cancellations fall on Tuesdays (6 of 12); 5 of 6 are recorded as bed availability, mostly in PM sessions.',
      limit:'The data cannot establish why beds were unavailable. Counts are small (n = 6).',
      next:'Should we review selected Orthopaedics Tuesday sessions with OR leadership and Patient Flow?'
    }
  };

  async function init() {
    const response = await fetch('data/or-demo.json');
    if (!response.ok) throw new Error('The synthetic demo data could not be loaded.');
    data = await response.json();
    bindStaticEvents();
    render();
  }

  function bindStaticEvents() {
    $$('.demo-switcher [data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
    $('#specialtyFilter').addEventListener('click', () => setView(state.view === 'baseline' ? 'orthopaedics' : 'baseline'));
    $('#resetButton').addEventListener('click', () => setView('baseline'));
    $('#patternsTab').addEventListener('click', () => setTab('patterns'));
    $('#casesTab').addEventListener('click', () => setTab('cases'));
    $('#kpiStrip').addEventListener('click', (event) => {
      const button = event.target.closest('[data-tooltip]');
      if (!button) return;
      returnFocusTo = button;
      state.openTooltip = state.openTooltip === button.dataset.tooltip ? null : button.dataset.tooltip;
      closeAbout(false);
      renderKpis();
    });
    $('#aboutButton').addEventListener('click', () => toggleAbout($('#aboutButton')));
    $('#definitionsButton').addEventListener('click', () => toggleAbout($('#definitionsButton')));
    $('#aboutClose').addEventListener('click', () => closeAbout(true));
    $$('.report-button').forEach((button) => button.addEventListener('click', reportIssue));
    $('#filtersToggle').addEventListener('click', () => {
      const open = $('#filtersToggle').getAttribute('aria-expanded') !== 'true';
      $('#filtersToggle').setAttribute('aria-expanded', String(open));
      $('#filters').classList.toggle('is-open', open);
    });
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);
  }

  function setView(view) {
    state.view = view;
    state.tab = 'patterns';
    state.openTooltip = null;
    closeAbout(false);
    render();
  }

  function setTab(tab) {
    state.tab = tab;
    renderInvestigation();
  }

  function render() {
    const drilled = state.view !== 'baseline';
    $$('.demo-switcher [data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    $('#specialtyFilterValue').textContent = drilled ? 'Orthopaedics' : 'All';
    $('#specialtyFilter').classList.toggle('is-selected', drilled);
    $('#roomFilter').hidden = !drilled;
    $('#resetButton').hidden = !drilled;
    renderKpis();
    renderTrend();
    renderSpecialties();
    renderInvestigation();
    renderBrief();
  }

  function renderKpis() {
    const color = { amber:'var(--amber-ink)', slate:'#475569', green:'var(--green)' };
    $('#kpiStrip').innerHTML = kpis.map((kpi, index) => {
      const open = state.openTooltip === kpi.id;
      return `<article class="kpi ${index === 0 ? 'signal' : ''}">
        <div class="kpi-label"><span>${kpi.label}</span><button class="info-button" type="button" data-tooltip="${kpi.id}" aria-label="What is ${kpi.label}?" aria-expanded="${open}" ${open ? `aria-describedby="tooltip-${kpi.id}"` : ''}>i</button></div>
        <div class="kpi-value-row"><strong class="kpi-value">${kpi.value}</strong><span class="kpi-status" style="color:${color[kpi.tone]}">${kpi.status}</span></div>
        <span class="kpi-context">${kpi.context}</span>
        ${open ? `<div class="tooltip" id="tooltip-${kpi.id}" role="tooltip"><strong>${kpi.label}</strong><span>${kpi.definition}</span><code>${kpi.formula}</code><small>Refreshed daily 06:00 · last 29 Sep, 06:10</small></div>` : ''}
      </article>`;
    }).join('');
  }

  function renderTrend() {
    const drilled = state.view !== 'baseline';
    const series = drilled ? data.orthopaedics : data.program;
    const band = drilled ? [5.4, 7.0] : [4.5, 5.6];
    const scale = (value) => value / 14 * 100;
    $('#trendTitle').textContent = drilled ? '13-week trend · Orthopaedics same-day cancellations' : '13-week trend · same-day cancellations';
    $('#programLegend').hidden = !drilled;
    const bars = series.map((value, index) => {
      const high = index >= 10 && value > band[1];
      return `<div class="bar-slot"><div class="trend-bar ${high ? 'is-high' : ''}" style="height:${scale(value)}%" aria-label="${data.weeks[index]}: ${value.toFixed(1)} percent">${high ? `<b>${value.toFixed(1)}</b>` : ''}</div>${drilled ? `<i class="program-tick" style="bottom:${scale(data.program[index])}%" aria-hidden="true"></i>` : ''}</div>`;
    }).join('');
    $('#trendChart').innerHTML = `<div class="expected-band" style="bottom:${scale(band[0])}%;height:${scale(band[1]-band[0])}%"></div>${[0,4,8,12].map((tick) => `<span class="axis-label" style="bottom:${scale(tick)}%">${tick}%</span>`).join('')}<div class="bars">${bars}</div>`;
    $('#weekLabels').innerHTML = data.weeks.map((week, index) => `<span class="${index >= 10 ? 'high' : ''}">${week}</span>`).join('');
    $('#trendTable').innerHTML = `<table><caption>${$('#trendTitle').textContent}</caption><thead><tr><th>Week</th>${data.weeks.map((week) => `<th>${week}</th>`).join('')}</tr></thead><tbody><tr><th>Rate</th>${series.map((value) => `<td>${value.toFixed(1)}%</td>`).join('')}</tr></tbody></table>`;
  }

  function renderSpecialties() {
    const drilled = state.view !== 'baseline';
    $('#specialtyList').innerHTML = data.specialties.map((specialty) => {
      const anomaly = specialty.name === 'Orthopaedics';
      const selected = anomaly && drilled;
      const tag = anomaly ? 'button' : 'div';
      return `<${tag} class="specialty-button ${anomaly ? 'is-action' : ''}" ${anomaly ? `type="button" data-specialty="orthopaedics" aria-pressed="${selected}" aria-label="${selected ? 'Return to program baseline' : 'Investigate Orthopaedics'}"` : ''}>
        <span class="specialty-heading"><span>${specialty.name}</span><span class="specialty-value">${anomaly ? '<span class="specialty-flag">▲ Above range</span>' : ''}${specialty.rate.toFixed(1)}%</span></span>
        <span class="specialty-track"><span class="specialty-fill ${anomaly ? 'anomaly' : ''}" style="width:${specialty.rate / 12 * 100}%"></span><i class="specialty-ref"></i></span>
      </${tag}>`;
    }).join('');
    const action = $('[data-specialty]');
    action.addEventListener('click', () => setView(drilled ? 'baseline' : 'orthopaedics'));
    $('#specialtyTable').innerHTML = `<table><caption>Same-day cancellations by specialty</caption><thead><tr><th>Specialty</th><th>Rate</th></tr></thead><tbody>${data.specialties.map((item) => `<tr><th>${item.name}</th><td>${item.rate.toFixed(1)}%</td></tr>`).join('')}</tbody></table>`;
  }

  function renderInvestigation() {
    const drilled = state.view !== 'baseline';
    $('#investigation').hidden = !drilled;
    if (!drilled) return;
    const tuesday = state.view === 'tuesday';
    $('#investigationTitle').textContent = tuesday ? 'Orthopaedics · Tuesday pattern' : 'Orthopaedics · where the variance sits';
    $('#investigationSubtitle').textContent = tuesday ? '6 cancellations of 26 booked Tuesday cases · last 4 weeks' : '12 cancellations of 120 booked cases · last 4 weeks';
    $('#caseTabCount').textContent = tuesday ? '6' : '12';
    $('#patternsTab').setAttribute('aria-selected', String(state.tab === 'patterns'));
    $('#casesTab').setAttribute('aria-selected', String(state.tab === 'cases'));
    $('#patternsPanel').hidden = state.tab !== 'patterns';
    $('#casesPanel').hidden = state.tab !== 'cases';
    if (state.tab === 'patterns') renderPatterns(tuesday); else renderCases(tuesday);
  }

  function renderPatterns(tuesday) {
    const reasons = tuesday ? [['Bed availability',5],['Patient not ready',1]] : [['Bed availability',7],['Patient not ready',2],['Case time overrun',1],['Other / not recorded',2]];
    const total = tuesday ? 6 : 12;
    const days = [['Mon',2],['Tue',6],['Wed',2],['Thu',1],['Fri',1]];
    const sessions = tuesday ? [['OR 2 · Tue PM','3/7',true],['OR 4 · Tue PM','2/6',true],['OR 2 · Tue AM','1/7',false],['OR 4 · Tue AM','0/6',false]] : [['OR 2','7/62',false],['OR 4','5/58',false]];
    $('#patternsPanel').innerHTML = `<div class="patterns-grid">
      <div class="pattern-group"><strong>Recorded reasons</strong>${reasons.map(([label,count],index) => `<div class="reason-row"><div class="reason-copy ${index === 0 ? 'is-primary' : ''}"><span>${label}</span><span class="reason-track"><i class="reason-fill" style="width:${count/total*100}%"></i></span></div><span class="reason-count">${count}/${total}</span></div>`).join('')}</div>
      <div class="pattern-group"><strong>Day of week <small>· select a day</small></strong><div class="day-bars">${days.map(([label,count]) => { const isTuesday = label === 'Tue'; return `<${isTuesday ? 'button' : 'div'} class="day-button ${isTuesday ? 'is-action' : ''}" ${isTuesday ? `type="button" data-day="tuesday" aria-pressed="${tuesday}" aria-label="${tuesday ? 'Return to Orthopaedics view' : 'Investigate Tuesday pattern'}"` : `aria-label="${label}: ${count} cancellations"`}><b>${count}</b><i class="day-column" style="height:${count/6*70}%"></i></${isTuesday ? 'button' : 'div'}>`; }).join('')}</div><div class="day-labels">${days.map(([label]) => `<span>${label}</span>`).join('')}</div></div>
      <div class="pattern-group"><strong>${tuesday ? 'Tuesday sessions' : 'By room'}</strong>${sessions.map(([label,value,hot]) => `<div class="session-row ${hot ? 'is-hot' : ''}"><strong>${label}</strong><span>${value}</span></div>`).join('')}<span class="session-note">Cancelled / booked</span></div>
    </div>`;
    $('[data-day="tuesday"]').addEventListener('click', () => setView(tuesday ? 'orthopaedics' : 'tuesday'));
  }

  function renderCases(tuesday) {
    const pool = data.cases.filter((item) => !tuesday || item.day === 'Tue');
    const rows = pool.slice(0,5);
    $('#casesPanel').innerHTML = `<table class="case-table"><thead><tr><th>Case ref</th><th>Date</th><th>Room / session</th><th>Recorded reason</th><th>QA status</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${item.id}</td><td>${item.date}</td><td>${item.room}</td><td>${item.reason}</td><td class="${item.flag ? 'case-flag' : 'case-passed'}">${item.flag ? `▲ ${item.flag}` : '✓ Passed'}</td></tr>`).join('')}</tbody></table><p class="case-foot">Showing 5 of ${tuesday ? 6 : 12} · most recent first · synthetic case refs, no patient identifiers</p>`;
  }

  function renderBrief() {
    const brief = briefs[state.view];
    $('#briefBody').innerHTML = [['Signal',brief.signal],['Pattern',brief.pattern],['Limit',brief.limit]].map(([label,text]) => `<div class="brief-item"><span class="brief-label">${label}</span><p>${text}</p></div>`).join('');
    $('#nextQuestion').textContent = brief.next;
  }

  function toggleAbout(trigger) {
    returnFocusTo = trigger;
    state.aboutOpen ? closeAbout(true) : openAbout();
  }
  function openAbout() {
    state.aboutOpen = true;
    state.openTooltip = null;
    $('#aboutPopover').hidden = false;
    $('#aboutButton').setAttribute('aria-expanded','true');
    renderKpis();
    $('#aboutClose').focus();
  }
  function closeAbout(restoreFocus) {
    if (!state.aboutOpen) return;
    state.aboutOpen = false;
    $('#aboutPopover').hidden = true;
    $('#aboutButton').setAttribute('aria-expanded','false');
    if (restoreFocus && returnFocusTo) returnFocusTo.focus();
  }
  function reportIssue() {
    closeAbout(false);
    $('#reportStatus').textContent = '— reporting connection placeholder';
  }
  function handleOutsideClick(event) {
    if (state.aboutOpen && !event.target.closest('#aboutPopover') && !event.target.closest('#aboutButton') && !event.target.closest('#definitionsButton')) closeAbout(false);
    if (state.openTooltip && !event.target.closest('.tooltip') && !event.target.closest('[data-tooltip]')) { state.openTooltip = null; renderKpis(); }
  }
  function handleKeydown(event) {
    if (event.key !== 'Escape') return;
    if (state.aboutOpen) closeAbout(true);
    if (state.openTooltip) { state.openTooltip = null; renderKpis(); if (returnFocusTo) requestAnimationFrame(() => returnFocusTo.focus()); }
  }

  init().catch((error) => { $('main').innerHTML = `<section class="panel"><h1>Dashboard unavailable</h1><p>${error.message}</p></section>`; });
})();
