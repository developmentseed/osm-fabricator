const {
  test, find, match, tail, init
} = require('ramda')
const limit = require('p-limit')(5)
const rp = require('request-promise-native')

async function getProjects (apiUrl) {
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


async function getContributions (apiUrl, project) {
  const { id} = project
  const qs = {
    monthDuration: -1,
    challengeIds: id,
    limit: 100
  }
  const userData = await rp({
    uri: `${apiUrl}/api/v2/data/user/leaderboard`,
    qs,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })

  const users = JSON.parse(userData).map(user => {
    const userObj = {
      userName: user.name,
      mapped: user.completedTasks,
      validated: 0
    }
    return userObj
  })

  const campaignObj = {
    userContributions: users
  }
  return JSON.stringify(campaignObj)
}


async function getProject(apiUrl, project) {
  const { id } = project
  return rp({
    uri: `${apiUrl}/api/v2/challenge/${id}`,
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })

}

module.exports = {
  getContributions,
  getProjects,
  getProject
}

