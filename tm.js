const {
  test, find, match, tail, init
} = require('ramda')
const limit = require('p-limit')(5)
const rp = require('request-promise-native')


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


async function getContributions (apiUrl, project) {
  const { projectId: id } = project

  return rp({
    uri: `${apiUrl}/api/v1/stats/project/${id}/contributions`,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
}


async function getProject(apiUrl, project) {
  const { projectId : id} = project
  return rp({
    uri: `${apiUrl}/api/v1/project/${id}?as_file=false`,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
}

module.exports =  {
  getContributions,
  getProjects,
  getProject
}
