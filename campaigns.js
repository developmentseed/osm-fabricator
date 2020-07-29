const {
  test, find, match, tail, init
} = require('ramda')
const rp = require('request-promise-native')
const limit = require('p-limit')(5)

/**
 * Given a campaign's changeset_comment return the hashtag
 * matching the tasking manager's schema for campaign hashtags
 * e.g for OSMUS the main hashtag is of the form `osmus-project-1`.
 *
 * If comment_changeset does not contain the project's id , it
 * defaults to the first hashtag it finds. If there are no
 * hashtags it returns null
 *
 * @param {string} str - changeset_comment from campaign
 * @returns {string} main hashtag for campaign
 */
function extractCampaignHashtag (str, projectId) {
  if (!str) return []

  const searchString = str.replace(/,/g, ' ') // remove commas

  // Get the hashtags
  // eslint-disable-next-line
  const hashtagRegex = /(#[^\u2000-\u206F\u2E00-\u2E7F\s\\'!"#$%()*,.\/;<=>?@\[\]^`{|}~]+)/g;
  const groups = match(hashtagRegex, searchString).map(tail)

  // Capture trailing : but leave ones in the middle
  // for example hotosm:to-fix is valid but not hotosm:
  const hashtags = groups.map(g => {
    if (test(/.+:$/, g)) {
      return init(g)
    } else {
      return g
    }
  })
  const main = find(test(new RegExp(`${projectId}`)), hashtags)

  if (main) {
    return main
  }
  return (hashtags.length > 0) ? hashtags[0] : `${projectId}`
}

// Get project details
async function getProject (apiUrl, id) {
  return rp({
    uri: `${apiUrl}/api/v1/project/${id}?as_file=false`,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
}

async function getContributions (apiUrl, id) {
  return rp({
    uri: `${apiUrl}/api/v1/stats/project/${id}/contributions`,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
}

// Get all tasking manager tasks
async function getProjects (apiUrl) {
  let qs = {
    page: 1
  }

  let firstResp = await rp({
    uri: `${apiUrl}/api/v1/project/search`,
    qs,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
  let json = JSON.parse(firstResp)

  let projects = json.results

  let numPages = json.pagination.pages
  let promises = []
  for (let i = 2; i <= numPages; i++) {
    qs.page = i
    promises.push(limit(() => rp({
      uri: `${apiUrl}/api/v1/project/search`,
      qs,
      headers: { 'Accept-Language': 'en-US,en;q=0.9' }
    })))
  }

  return Promise.all(promises).then(responses => {
    responses.forEach(response => {
      let results = JSON.parse(response).results
      results.forEach(project => {
        projects.push(project)
      })
    })

    return projects
  })
}

async function getAllProjects(apiUrl) {
  apiUrl = apiUrl || 'https://tasks.hotosm.org'
  const projects = await getProjects(apiUrl)
  const projectsWithData = await Promise.all(projects.map(async (project) => {
    try {
      const projectData = JSON.parse(await getProject(apiUrl, project.projectId))
      const projectContributions = JSON.parse(await getContributions(apiUrl, project.projectId))
      return {  
        meta: projectData,
        contributions: projectContributions.userContributions
      }
    } catch (e) {
      return {}
    }
  }))
  return projectsWithData
}

module.exports = {
  getAllProjects, extractCampaignHashtag
}
