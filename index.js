const { getAllProjects, extractCampaignHashtag } = require('./campaigns.js')
const rp = require('request-promise-native')
const chance = require('chance').Chance(12345)
const { reject, isEmpty, pick } = require('ramda')
const db = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL
})

const changesetProps = ['id', 'measurements', 'counts', 'total_edits', 'editor', 'user_id', 'created_at', 'closed_at']
const projectProps = ['hashtag']

class Changeset {
  constructor(args) {
    changesetProps.forEach(prop => {
      this[prop] = args[prop]
    })
  }

  async save() {
    await db('changesets').insert(pick(changesetProps, this))
    return this
  }
}

class Project { 
  constructor (tmData) {
    this.id = tmData.meta.projectId || tmData.meta.id
    this.meta = tmData.meta
    this.hashtag = extractCampaignHashtag(tmData.meta.changesetComment, this.id)
    this.contributions = tmData.contributions
  }

  async save() {
    await db('hashtags').insert({ id: this.id, hashtag: this.hashtag })
    return this
  }
}

class User {
  constructor (username) {
    this.id = null
    this.username = username
  }

  async save() {
    try {
      let contributorId = await db('users').where('name', this.username)
      if (contributorId.length === 0) {
        const users = JSON.parse(await rp(`http://whosthat.osmz.ru/whosthat.php?action=names&q=${encodeURIComponent(this.username)}`))
        this.id = users[0].id
        await db('users').insert({ 'id': this.id, 'name': this.username } )
      } else {
        this.id = contributorId[0].id
      }
    } catch (e) {
      console.error('could not save user', this.username, e)
      throw new Error(`could not save user ${this.username}`)
    }

    return this
  }
}

async function simulateOSM() {
  const tmData = await getAllProjects('https://tasks.openstreetmap.us', 'tm')
  const projects = reject(isEmpty, tmData).map(p => new Project(p))
  console.log(projects)
  return


  const countries = await db('countries').select('id')

  let changesetCounter = 0

  // for each project
  for (const pidx in projects) {
    try {
      let project = projects[pidx]
      process.stdout.clearLine(); process.stdout.cursorTo(0);
      console.log(`saving project #${project.hashtag}`)
      project = await project.save()

      // pick a country
      const country = chance.pickone(countries)

      const countTypes = ['roads', 'waterways', 'coastlines', 'buildings', 'pois', 'raillines']
      const measurementTypes = ['road', 'waterway', 'coastline', 'railline']

      // for each contributor, create changesets
      for (const idx in project.contributions) {
        const contributor = project.contributions[idx]
        const user = await new User(contributor.username).save()

        for (let i = 0; i < (contributor.mapped + contributor.validated); i++) {
          const editCount = chance.integer({ min: 1, max: 20 })

          try {
            process.stdout.write(`saving changeset #${changesetCounter} for user ${user.username}\r`)
            const changeset = await new Changeset({
              id: changesetCounter++,
              measurements: {
                [`${chance.pickone(measurementTypes)}_km_${chance.pickone(['added', 'modified', 'deleted'])}`]: chance.floating({ min: 0, max: 10 })
              },
              counts: {
                [`${chance.pickone(countTypes)}_${chance.pickone(['added', 'modified', 'deleted'])}`]: editCount
              },
              total_edits: editCount,
              editor: 'JOSM',
              user_id: user.id,
              created_at: project.meta.created,
              closed_at: project.meta.created
            }).save()

            // join tables
            await db('changesets_countries').insert({ changeset_id: changeset.id, country_id: country.id, edit_count: editCount })
            await db('changesets_hashtags').insert({ changeset_id: changeset.id, hashtag_id: project.id })
          } catch (e) {
            console.error("Could not save changeset #" + changesetCounter, e) 
          }
        }
      }
    } catch (e) {
      console.error(`Could not save project ${projects[pidx].hashtag}`)
    }
	}
}

async function simulateMR() {
  const tmData = await getAllProjects('https://maproulette.org', 'mr')
  const projects = reject(isEmpty, tmData).map(p => {
    p.meta.changesetComment = `#maproulette-challenge-${p.meta.id}`
    return new Project(p)
  })
  //console.log(projects)

}

async function simulate() {
  await simulateMR()
  //return await simulateOSM()
}

// Simulate and cleanup
//simulate().then(() => db.destroy())
simulate().then(() => db.destroy())
