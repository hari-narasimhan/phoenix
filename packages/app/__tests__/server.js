const App = require('../lib/app')
const params = require('./appConfig')

const app = App.create(params)

const running = app.listen(3000)

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  console.log('Closing http server.');
  running.close(() => {
    console.log('Http server closed.');
  });
});

process.on('SIGINT', () => {
  console.info('SIGINT signal received.');
  console.log('Closing http server.');
  running.close(() => {
    console.log('Http server closed.');
  });
});
