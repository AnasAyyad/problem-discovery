import type { FastifyPluginAsync } from 'fastify';

function renderUiPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hunter</title>
    <style>
      :root {
        --bg: #f6f3ef;
        --card: #ffffff;
        --line: #e6ded5;
        --text: #1d1815;
        --muted: #6e6359;
        --brand: #b15f3d;
        --brand-dark: #8a472b;
        --green: #2f7a58;
        --yellow: #b68524;
        --red: #b34b3d;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
      }

      .page {
        width: min(980px, calc(100vw - 24px));
        margin: 0 auto;
        padding: 24px 0 40px;
      }

      .header {
        margin-bottom: 18px;
      }

      .header h1 {
        margin: 0 0 8px;
        font-size: 30px;
      }

      .header p {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }

      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 16px;
      }

      .card h2 {
        margin: 0 0 14px;
        font-size: 19px;
      }

      form {
        display: grid;
        gap: 12px;
      }

      label {
        display: grid;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
      }

      .hint {
        color: var(--muted);
        font-size: 12px;
        font-weight: 400;
      }

      textarea,
      input {
        width: 100%;
        font: inherit;
        padding: 11px 12px;
        border-radius: 12px;
        border: 1px solid var(--line);
        background: #fffdfa;
      }

      textarea {
        min-height: 82px;
        resize: vertical;
      }

      .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      button {
        border: none;
        border-radius: 999px;
        padding: 10px 16px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .primary {
        background: var(--brand);
        color: white;
      }

      .secondary {
        background: #f1ebe3;
        color: var(--brand-dark);
      }

      button:disabled {
        cursor: wait;
        opacity: 0.7;
      }

      .run-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 12px;
      }

      .run-top strong {
        display: block;
        margin-bottom: 4px;
      }

      .run-top span {
        color: var(--muted);
        font-size: 13px;
      }

      .pill {
        padding: 7px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .pill.idle { background: #efebe6; color: var(--muted); }
      .pill.running { background: #f8efd7; color: var(--yellow); }
      .pill.completed { background: #dff0e8; color: var(--green); }
      .pill.failed { background: #f6dfdb; color: var(--red); }

      .progress {
        width: 100%;
        height: 10px;
        border-radius: 999px;
        background: #efe8de;
        overflow: hidden;
        margin-bottom: 10px;
      }

      .progress > div {
        height: 100%;
        width: 0%;
        background: var(--brand);
        transition: width 0.2s ease;
      }

      .progress-meta,
      .timer-row,
      .pager {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }

      .progress-meta,
      .timer-row,
      .pager {
        color: var(--muted);
        font-size: 13px;
      }

      .timer-row {
        margin: 12px 0 14px;
      }

      .step-list {
        display: grid;
        gap: 8px;
        margin-bottom: 14px;
      }

      .step-item {
        display: grid;
        grid-template-columns: 20px 1fr auto;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid var(--line);
        background: #fcfaf7;
        align-items: center;
      }

      .step-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #cbbfb3;
      }

      .step-item.running .step-dot { background: var(--yellow); }
      .step-item.completed .step-dot { background: var(--green); }
      .step-item.failed .step-dot { background: var(--red); }

      .step-main strong {
        display: block;
        margin-bottom: 3px;
        font-size: 14px;
      }

      .step-main span {
        color: var(--muted);
        font-size: 12px;
      }

      .step-time {
        font-size: 12px;
        color: var(--muted);
        text-align: right;
      }

      .log-box {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fbf8f4;
        padding: 10px 0;
      }

      .log-header {
        padding: 0 12px 8px;
        border-bottom: 1px solid var(--line);
        font-size: 13px;
        color: var(--muted);
      }

      .log-list {
        max-height: 220px;
        overflow: auto;
        padding: 10px 12px 0;
        display: grid;
        gap: 8px;
      }

      .log-item,
      .source-item {
        font-size: 13px;
        color: var(--muted);
        padding: 8px 10px;
        border-radius: 10px;
        background: #ffffff;
        border: 1px solid var(--line);
      }

      .log-item strong,
      .source-item strong {
        color: var(--text);
      }

      .section-label {
        margin: 14px 0 8px;
        font-size: 13px;
        color: var(--muted);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .source-list {
        display: grid;
        gap: 8px;
      }

      .results-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 12px;
      }

      .results-head strong {
        display: block;
        margin-bottom: 3px;
      }

      .results-head span {
        color: var(--muted);
        font-size: 13px;
      }

      .accordion-list {
        display: grid;
        gap: 10px;
      }

      details.opportunity {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #fffdfa;
        overflow: hidden;
      }

      details.opportunity summary {
        list-style: none;
        cursor: pointer;
        padding: 14px 16px;
      }

      details.opportunity summary::-webkit-details-marker {
        display: none;
      }

      .summary-row {
        display: grid;
        grid-template-columns: 20px 1fr auto auto;
        gap: 12px;
        align-items: center;
      }

      .chevron {
        font-size: 16px;
        color: var(--muted);
        transition: transform 0.16s ease;
      }

      details[open] .chevron {
        transform: rotate(90deg);
      }

      .summary-main strong {
        display: block;
        margin-bottom: 4px;
        font-size: 16px;
      }

      .summary-main span {
        color: var(--muted);
        font-size: 13px;
      }

      .summary-score {
        text-align: right;
        font-size: 13px;
        color: var(--muted);
      }

      .summary-score strong {
        display: block;
        font-size: 18px;
        color: var(--text);
      }

      .summary-meta {
        font-size: 12px;
        color: var(--muted);
        text-align: right;
      }

      .opportunity-body {
        border-top: 1px solid var(--line);
        padding: 14px 16px 16px;
      }

      .detail-grid {
        display: grid;
        gap: 10px;
      }

      .detail-item {
        padding: 10px 12px;
        border-radius: 12px;
        background: #faf7f2;
      }

      .detail-item strong {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
      }

      .detail-item p {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }

      .evidence-list {
        display: grid;
        gap: 8px;
      }

      .evidence-list a {
        color: var(--brand-dark);
        text-decoration: none;
        font-weight: 700;
      }

      .evidence-list small {
        display: block;
        color: var(--muted);
        margin-top: 3px;
      }

      .pager {
        margin-top: 14px;
      }

      .pager button {
        padding: 8px 14px;
      }

      .empty {
        color: var(--muted);
        text-align: center;
        padding: 18px;
        border: 1px dashed var(--line);
        border-radius: 12px;
      }

      @media (max-width: 740px) {
        .row {
          grid-template-columns: 1fr;
        }

        .summary-row,
        .step-item {
          grid-template-columns: 20px 1fr;
        }

        .summary-score,
        .summary-meta,
        .step-time {
          text-align: left;
        }

        .summary-score,
        .summary-meta {
          grid-column: 2;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <h1>Hunter</h1>
        <p>Run discovery, review progress like a job log, and keep the opportunity list manageable by ignoring what you do not want to see again.</p>
      </div>

      <section class="card">
        <h2>Run Pipeline</h2>
        <form id="pipeline-form">
          <label>
            Keywords
            <textarea id="keywords" placeholder="spreadsheet, manual process, inventory reconciliation"></textarea>
            <span class="hint">Optional comma-separated override for this run.</span>
          </label>

          <label>
            Web URLs
            <textarea id="webUrls" placeholder="https://example.com/post-1, https://example.com/post-2"></textarea>
            <span class="hint">Optional comma-separated override for this run.</span>
          </label>

          <div class="row">
            <label>
              Ingest Limit
              <input id="ingestLimit" type="number" min="5" max="100" value="25" />
              <span class="hint">Minimum 5, maximum 100.</span>
            </label>

            <label>
              Evidence Limit
              <input id="extractLimit" type="number" min="5" max="100" value="25" />
              <span class="hint">Minimum 5, maximum 100.</span>
            </label>
          </div>

          <div class="actions">
            <button id="runButton" class="primary" type="submit">Run</button>
            <button id="refreshButton" class="secondary" type="button">Refresh Opportunities</button>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="run-top">
          <div>
            <strong id="statusTitle">No active run</strong>
            <span id="statusSubtitle">Start a pipeline run to see progress.</span>
          </div>
          <div id="jobPill" class="pill idle">idle</div>
        </div>

        <div class="progress"><div id="progressFill"></div></div>
        <div class="progress-meta">
          <span id="progressMessage">Waiting.</span>
          <span id="progressPercent">0%</span>
        </div>

        <div class="timer-row">
          <span>Total job time</span>
          <strong id="jobTimer">00:00</strong>
        </div>

        <div id="stepList" class="step-list"></div>

        <div class="section-label">Sources</div>
        <div id="sourceList" class="source-list"></div>

        <div class="section-label">Progress Log</div>
        <div class="log-box">
          <div class="log-header">Latest events</div>
          <div id="logList" class="log-list"></div>
        </div>
      </section>

      <section class="card">
        <div class="results-head">
          <div>
            <strong id="resultsTitle">Opportunities</strong>
            <span id="resultsSubtitle">Showing 5 per page. Ignored items stay hidden.</span>
          </div>
        </div>

        <div id="opportunityList" class="accordion-list">
          <div class="empty">Loading opportunities…</div>
        </div>

        <div class="pager">
          <button id="prevPageButton" class="secondary" type="button">Previous</button>
          <span id="pageInfo">Page 1 of 1</span>
          <button id="nextPageButton" class="secondary" type="button">Next</button>
        </div>
      </section>
    </div>

    <script>
      const state = {
        activeJobId: null,
        pollTimer: null,
        uiTimer: null,
        opportunitiesPage: 1,
        opportunitiesLimit: 5,
        opportunitiesTotalPages: 1,
        currentJob: null
      };

      const form = document.getElementById('pipeline-form');
      const runButton = document.getElementById('runButton');
      const refreshButton = document.getElementById('refreshButton');
      const prevPageButton = document.getElementById('prevPageButton');
      const nextPageButton = document.getElementById('nextPageButton');
      const pageInfo = document.getElementById('pageInfo');
      const statusTitle = document.getElementById('statusTitle');
      const statusSubtitle = document.getElementById('statusSubtitle');
      const jobPill = document.getElementById('jobPill');
      const progressFill = document.getElementById('progressFill');
      const progressMessage = document.getElementById('progressMessage');
      const progressPercent = document.getElementById('progressPercent');
      const jobTimer = document.getElementById('jobTimer');
      const stepList = document.getElementById('stepList');
      const sourceList = document.getElementById('sourceList');
      const logList = document.getElementById('logList');
      const opportunityList = document.getElementById('opportunityList');
      const resultsTitle = document.getElementById('resultsTitle');

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function splitCommaSeparated(value) {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }

      function parseLimit(id) {
        const raw = document.getElementById(id).value.trim();
        if (!raw) return undefined;
        const parsed = Number(raw);
        return Number.isInteger(parsed) ? parsed : undefined;
      }

      function formatDuration(startedAt, finishedAt) {
        if (!startedAt) return '00:00';
        const start = new Date(startedAt).getTime();
        const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
        const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
          return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        }
        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
      }

      function setStatus(status, title, subtitle) {
        statusTitle.textContent = title;
        statusSubtitle.textContent = subtitle;
        jobPill.className = 'pill ' + status;
        jobPill.textContent = status;
      }

      function renderStepList(progress) {
        const statuses = progress?.steps || {
          ingest: 'pending',
          embed: 'pending',
          extract: 'pending',
          score: 'pending'
        };
        const details = progress?.stepDetails || {
          ingest: { startedAt: null, finishedAt: null },
          embed: { startedAt: null, finishedAt: null },
          extract: { startedAt: null, finishedAt: null },
          score: { startedAt: null, finishedAt: null }
        };
        const summaryByStep = {
          ingest: progress?.sourceResults?.length ? progress.sourceResults.map((item) => item.source + ': ' + item.status).join(' · ') : 'Waiting',
          embed: progress?.embed ? (progress.embed.total > 0 ? progress.embed.completed + '/' + progress.embed.total + ' embedded' : 'Waiting') : 'Waiting',
          extract: progress?.extract ? (progress.extract.total > 0 ? progress.extract.completed + '/' + progress.extract.total + ' extracted' : 'Waiting') : 'Waiting',
          score: progress?.steps?.score === 'completed' ? 'Materialized' : 'Waiting'
        };

        stepList.innerHTML = ['ingest', 'embed', 'extract', 'score'].map((step) => {
          const status = statuses[step] || 'pending';
          const timing = details[step] || { startedAt: null, finishedAt: null };
          return (
            '<div class="step-item ' + escapeHtml(status) + '">' +
              '<div class="step-dot"></div>' +
              '<div class="step-main"><strong>' + escapeHtml(step) + '</strong><span>' + escapeHtml(summaryByStep[step]) + '</span></div>' +
              '<div class="step-time">' + escapeHtml(formatDuration(timing.startedAt, timing.finishedAt)) + '</div>' +
            '</div>'
          );
        }).join('');
      }

      function renderSources(progress) {
        const sources = Array.isArray(progress?.sourceResults) ? progress.sourceResults : [];
        sourceList.innerHTML = sources.length
          ? sources.map((item) => (
              '<div class="source-item"><strong>' + escapeHtml(item.source) + '</strong>: ' +
              escapeHtml(item.status) + ', fetched ' + escapeHtml(item.fetchedCount) + ', persisted ' + escapeHtml(item.persistedCount) +
              (item.message ? ' (' + escapeHtml(item.message) + ')' : '') +
              '</div>'
            )).join('')
          : '<div class="empty">Source status will appear here.</div>';
      }

      function renderLogs(progress) {
        const events = Array.isArray(progress?.recentEvents) ? progress.recentEvents : [];
        logList.innerHTML = events.length
          ? events.slice().reverse().map((event) => '<div class="log-item">' + escapeHtml(event) + '</div>').join('')
          : '<div class="empty">Run events will appear here.</div>';
        logList.scrollTop = 0;
      }

      function renderProgress(job) {
        state.currentJob = job;
        const progress = job?.progress || {};
        const status = job?.status || 'idle';
        const percent = typeof progress.percent === 'number' ? progress.percent : 0;

        setStatus(
          status === 'running' ? 'running' : status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'idle',
          job ? 'Run #' + job.id : 'No active run',
          job ? 'Progress updates from the backend.' : 'Start a pipeline run to see progress.'
        );

        progressFill.style.width = percent + '%';
        progressPercent.textContent = percent + '%';
        progressMessage.textContent = progress.message || 'Waiting.';
        jobTimer.textContent = formatDuration(progress.startedAt, progress.finishedAt);
        renderStepList(progress);
        renderSources(progress);
        renderLogs(progress);
      }

      function renderOpportunities(items, pagination) {
        resultsTitle.textContent = 'Opportunities (' + pagination.total + ')';
        pageInfo.textContent = 'Page ' + pagination.page + ' of ' + pagination.totalPages;
        prevPageButton.disabled = pagination.page <= 1;
        nextPageButton.disabled = pagination.page >= pagination.totalPages;

        if (!Array.isArray(items) || items.length === 0) {
          opportunityList.innerHTML = '<div class="empty">No visible opportunities right now.</div>';
          return;
        }

        opportunityList.innerHTML = items.map((item) => {
          const evidenceItems = Array.isArray(item.evidenceItems) ? item.evidenceItems : [];
          return (
            '<details class="opportunity">' +
              '<summary>' +
                '<div class="summary-row">' +
                  '<div class="chevron">›</div>' +
                  '<div class="summary-main"><strong>' + escapeHtml(item.problem) + '</strong><span>' + escapeHtml(item.targetCustomer) + '</span></div>' +
                  '<div class="summary-score"><strong>' + escapeHtml(item.opportunityScore) + '</strong><span>confidence ' + escapeHtml(item.confidenceScore) + '</span></div>' +
                  '<div class="summary-meta">' +
                    'evidence ' + escapeHtml(item.evidenceCount) + '<br />sources ' + escapeHtml(item.sourceDiversity) +
                  '</div>' +
                '</div>' +
              '</summary>' +
              '<div class="opportunity-body">' +
                '<div class="actions" style="margin-bottom: 12px;">' +
                  '<button class="secondary ignore-button" data-id="' + escapeHtml(item.id) + '" type="button">Ignore</button>' +
                '</div>' +
                '<div class="detail-grid">' +
                  '<div class="detail-item"><strong>Pain</strong><p>' + escapeHtml(item.painDescription) + '</p></div>' +
                  '<div class="detail-item"><strong>Impact</strong><p>' + escapeHtml(item.businessImpact) + '</p></div>' +
                  '<div class="detail-item"><strong>Workaround</strong><p>' + escapeHtml(item.currentWorkaround || 'Not provided') + '</p></div>' +
                  '<div class="detail-item"><strong>Potential Solution</strong><p>' + escapeHtml(item.potentialSolution) + '</p></div>' +
                  '<div class="detail-item"><strong>MVP Scope</strong><p>' + escapeHtml(item.mvpScope) + '</p></div>' +
                  '<div class="detail-item"><strong>Estimated Pricing</strong><p>' + escapeHtml(item.estimatedPricing || 'Not provided') + '</p></div>' +
                '</div>' +
                '<div class="section-label" style="margin-top: 12px;">Evidence</div>' +
                '<div class="evidence-list">' +
                  evidenceItems.map((evidence) => (
                    '<div class="source-item">' +
                      '<a href="' + escapeHtml(evidence.sourceUrl) + '" target="_blank" rel="noreferrer">' + escapeHtml(evidence.title || evidence.sourceUrl) + '</a>' +
                      '<small>' + escapeHtml(evidence.source) + ' · item ' + escapeHtml(evidence.sourceItemId) + '</small>' +
                    '</div>'
                  )).join('') +
                '</div>' +
              '</div>' +
            '</details>'
          );
        }).join('');

        document.querySelectorAll('.ignore-button').forEach((button) => {
          button.addEventListener('click', async () => {
            const id = button.getAttribute('data-id');
            if (!id) return;
            button.disabled = true;

            try {
              const response = await fetch('/opportunities/' + id + '/ignore', { method: 'POST' });
              if (!response.ok) throw new Error('Failed to ignore opportunity');
              await loadOpportunities(state.opportunitiesPage);
            } catch (error) {
              button.disabled = false;
              alert(error.message || 'Failed to ignore opportunity');
            }
          });
        });
      }

      async function loadOpportunities(page = 1) {
        const response = await fetch('/opportunities?limit=' + state.opportunitiesLimit + '&page=' + page);
        const payload = await response.json();
        state.opportunitiesPage = payload.pagination.page;
        state.opportunitiesTotalPages = payload.pagination.totalPages;

        if (payload.pagination.page > 1 && payload.items.length === 0) {
          return loadOpportunities(payload.pagination.page - 1);
        }

        renderOpportunities(payload.items || [], payload.pagination);
      }

      function stopPolling() {
        if (state.pollTimer) {
          clearInterval(state.pollTimer);
          state.pollTimer = null;
        }
        if (state.uiTimer) {
          clearInterval(state.uiTimer);
          state.uiTimer = null;
        }
      }

      function startUiTimer() {
        if (state.uiTimer) clearInterval(state.uiTimer);
        state.uiTimer = setInterval(() => {
          if (state.currentJob) renderProgress(state.currentJob);
        }, 1000);
      }

      async function pollJob() {
        if (!state.activeJobId) return;

        const response = await fetch('/pipeline/jobs/' + state.activeJobId);
        const job = await response.json();
        renderProgress(job);

        if (job.status === 'completed' || job.status === 'failed') {
          stopPolling();
          runButton.disabled = false;
          await loadOpportunities(1);
        }
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        runButton.disabled = true;

        const keywords = splitCommaSeparated(document.getElementById('keywords').value);
        const webUrls = splitCommaSeparated(document.getElementById('webUrls').value);
        const ingestLimit = parseLimit('ingestLimit');
        const extractLimit = parseLimit('extractLimit');

        try {
          const response = await fetch('/pipeline/jobs', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              ...(keywords.length > 0 ? { keywords } : {}),
              ...(webUrls.length > 0 ? { webUrls } : {}),
              ...(typeof ingestLimit === 'number' ? { ingestLimit } : {}),
              ...(typeof extractLimit === 'number' ? { extractLimit } : {})
            })
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.message || 'Failed to start pipeline job');
          }

          const job = await response.json();
          state.activeJobId = job.id;
          renderProgress(job);
          stopPolling();
          startUiTimer();
          state.pollTimer = setInterval(() => {
            pollJob().catch((error) => {
              stopPolling();
              runButton.disabled = false;
              setStatus('failed', 'Polling failed', error.message || 'Failed to track pipeline job.');
            });
          }, 1500);
        } catch (error) {
          runButton.disabled = false;
          setStatus('failed', 'Run failed to start', error.message || 'Failed to start pipeline job.');
        }
      });

      refreshButton.addEventListener('click', () => {
        loadOpportunities(state.opportunitiesPage).catch(() => {
          opportunityList.innerHTML = '<div class="empty">Failed to refresh opportunities.</div>';
        });
      });

      prevPageButton.addEventListener('click', () => {
        if (state.opportunitiesPage > 1) {
          loadOpportunities(state.opportunitiesPage - 1);
        }
      });

      nextPageButton.addEventListener('click', () => {
        if (state.opportunitiesPage < state.opportunitiesTotalPages) {
          loadOpportunities(state.opportunitiesPage + 1);
        }
      });

      setStatus('idle', 'No active run', 'Start a pipeline run to see progress.');
      renderProgress(null);
      loadOpportunities(1).catch(() => {
        opportunityList.innerHTML = '<div class="empty">Failed to load opportunities.</div>';
      });
    </script>
  </body>
</html>`;
}

export const registerUiRoute: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    return reply.type('text/html').send(renderUiPage());
  });
};
