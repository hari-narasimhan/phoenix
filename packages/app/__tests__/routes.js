const App = require('../lib/app')
const projects = [{name: "Project 101", cost: 22456}, {name: "Project 102", cost: 4412}]

exports.register = (router) => {
  // GET /api/v1/projects
  router.get('/projects', async (ctx, next) => { 
    ctx.body = projects;
    const Resources = App.resources()
    const db = Resources.get('db')
    const result = await db.find({context: {tenant: 'testDB', coll: 'projects'}})
    next() 
  })
  // GET /api/v1/requestId
  router.get('/requestId', async (ctx, next) => { console.log('REQUEST ID', ctx.requestId); ctx.body = { requestId: ctx.requestId }; next() })
  // GET /api/v1/error
  router.get('/error', async (ctx, next) => { 
    throw new Error('Test an error call') 
  })
}
