// Turns Playwright's JSON report into a job summary and one PR comment (updated on every push).
// Called from .github/workflows/e2e.yml via actions/github-script.
const fs = require('node:fs');

const RESULTS_FILE = 'e2e/test-results/results.json';
const MARKER = '<!-- e2e-report -->';
const ANSI = /\u001b\[[0-9;]*m/g;

const STATUS = {
  expected: '✅ passed',
  unexpected: '❌ failed',
  flaky: '⚠️ flaky (passed on retry)',
  skipped: '⏭️ skipped',
};

function collectTests(suite, out = []) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests) out.push({ title: spec.title, file: spec.file, ...test });
  }
  for (const child of suite.suites ?? []) collectTests(child, out);
  return out;
}

// For a failed test: the test.step that failed and its error, taken from the last attempt
function describeFailure(test) {
  const last = test.results.at(-1);
  if (!last) return { step: '', error: '' };
  const step = last.steps?.find((s) => s.error)?.title ?? '';
  const message = last.errors?.[0]?.message ?? last.error?.message ?? '';
  const error = message.replace(ANSI, '').split('\n').slice(0, 20).join('\n').trim();
  return { step, error };
}

function buildReport(results, { outcome, artifactUrl, runUrl, sha }) {
  const links = [
    artifactUrl && `📦 [Playwright report + trace](${artifactUrl})`,
    runUrl && `🔎 [Run log](${runUrl})`,
    sha && `Commit \`${sha.slice(0, 7)}\``,
  ].filter(Boolean).join(' · ');

  if (!results) {
    return [
      MARKER,
      '## ❌ E2E did not run',
      'No Playwright results were produced: the app or the test runner failed to start. Check the run log.',
      '',
      links,
    ].join('\n');
  }

  const tests = results.suites.flatMap((s) => collectTests(s));
  const { unexpected = 0, flaky = 0 } = results.stats;
  const headline = unexpected > 0 || outcome === 'failure'
    ? '## ❌ E2E failed'
    : flaky > 0 ? '## ⚠️ E2E passed with flaky tests' : '## ✅ E2E passed';

  const lines = [MARKER, headline, '', '| Test | Result | Failed step |', '|---|---|---|'];
  const details = [];
  for (const test of tests) {
    const { step, error } = test.status === 'unexpected' ? describeFailure(test) : { step: '', error: '' };
    lines.push(`| ${test.title} | ${STATUS[test.status] ?? test.status} | ${step} |`);
    if (error) {
      details.push('', `<details><summary>Error: ${test.title}</summary>`, '', '```', error, '```', '</details>');
    }
  }

  return [...lines, ...details, '', links].join('\n');
}

module.exports = async function summarize({ github, context, core }) {
  const results = fs.existsSync(RESULTS_FILE) ? JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')) : null;
  const pr = context.payload.pull_request;
  const body = buildReport(results, {
    outcome: process.env.E2E_OUTCOME,
    artifactUrl: process.env.ARTIFACT_URL,
    runUrl: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
    sha: pr?.head.sha ?? context.sha,
  });

  await core.summary.addRaw(body).write();
  if (!pr) return;

  // Fork PRs get a read-only token, so commenting can fail; the job summary above still has everything
  try {
    const comments = await github.paginate(github.rest.issues.listComments, {
      ...context.repo,
      issue_number: pr.number,
      per_page: 100,
    });
    const existing = comments.find((c) => c.user?.type === 'Bot' && c.body?.includes(MARKER));
    if (existing) {
      await github.rest.issues.updateComment({ ...context.repo, comment_id: existing.id, body });
    } else {
      await github.rest.issues.createComment({ ...context.repo, issue_number: pr.number, body });
    }
  } catch (err) {
    core.warning(`Could not post the PR comment: ${err.message}`);
  }
};

module.exports.buildReport = buildReport;
