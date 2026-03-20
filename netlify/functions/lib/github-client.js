const GITHUB_API = 'https://api.github.com';

const asHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'qicn-selfpatch'
});

const ensureOk = async (response, context = 'github_request_failed') => {
  if (response.ok) return response;
  const payload = await response.text().catch(() => '');
  const error = new Error(`${context}: ${response.status} ${payload.slice(0, 300)}`);
  error.status = response.status;
  throw error;
};

export const getRepoVariable = async ({ owner, repo, name, token, fetchImpl = fetch }) => {
  const response = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/actions/variables/${name}`, {
    method: 'GET',
    headers: asHeaders(token)
  });
  await ensureOk(response, 'github_get_variable_failed');
  return response.json();
};

export const listPullRequests = async ({
  owner,
  repo,
  state = 'all',
  perPage = 100,
  token,
  fetchImpl = fetch
}) => {
  const response = await fetchImpl(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(state)}&per_page=${encodeURIComponent(perPage)}`,
    { method: 'GET', headers: asHeaders(token) }
  );
  await ensureOk(response, 'github_list_prs_failed');
  return response.json();
};

export const getRepo = async ({ owner, repo, token, fetchImpl = fetch }) => {
  const response = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}`, {
    method: 'GET',
    headers: asHeaders(token)
  });
  await ensureOk(response, 'github_get_repo_failed');
  return response.json();
};

export default {
  getRepoVariable,
  listPullRequests,
  getRepo
};
