const {
  test, find, match, tail, init
} = require('ramda')
const rp = require('request-promise-native')
const limit = require('p-limit')(5)

const TMApi = require('./tm')
const MRApi = require('./mr')


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
  console.log(groups)

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


/*
// Get project details
async function getProjectOSM(apiUrl, id) {
  return rp({
    uri: `${apiUrl}/api/v1/project/${id}?as_file=false`,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
}

async function getProjectMR(apiUrl, id) {
  return rp({
    uri: `${apiUrl}/api/v2/challenge/${id}`,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
}



async function getProject (apiUrl, id, type) {
  switch (type) {
    case 'mr':
        return await getProjectMR(apiUrl, id)
    case 'osm':
      return await getProjectOSM(apiUrl, id)
    default: 
      return new Error(`Invalid type' ${type}`)
  }
  
}
async function getContributions (apiUrl, id) {
  return rp({
    uri: `${apiUrl}/api/v1/stats/project/${id}/contributions`,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
}

// Get all tasking manager tasks
async function getProjectsOSM (apiUrl) {
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

async function getProjectsMR (apiUrl) {
  let qs = {
    page: 0,
    limit: 50
  }

  const resp = await rp({
    uri: `${apiUrl}/api/v2/challenges/extendedFind`,
    qs,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })

  const challenges = JSON.parse(resp)
  return challenges
}

async function getProjects(apiUrl, type) {
  switch (type) {
    case 'mr':
        return await getProjectsMR(apiUrl)
    case 'osm':
      return await getProjectsOSM(apiUrl)
    default: 
      return new Error(`Invalid type' ${type}`)
  }
}
*/

function getApi (type) {
  switch (type) {
    case 'mr':
      return MRApi
    case 'tm':
      return TMApi
    default: 
      return new Error(`Invalid type' ${type}`)
  }
}

async function getAllProjects(apiUrl, type) {
  apiUrl = apiUrl || 'https://tasks.hotosm.org'
  type = type || 'tm'

  const {getProjects, getProject, getContributions} = getApi(type)

  const projects = await getProjects(apiUrl)
  const projectsWithData = await Promise.all(projects.map(async (project) => {
    try {
      const projectData = JSON.parse(await getProject(apiUrl, project, type))
      const projectContributions = JSON.parse(await getContributions(apiUrl, project))
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
