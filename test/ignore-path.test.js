const assert = require('assert');
const path = require('path');
const axios = require('axios').default;
const awsMock = require('aws-sdk-mock');
const gateway = require('express-gateway');

const { prepare } = require('./helpers');

const CONFIG_PATH = path.join(__dirname, './fixtures/ignore-path/config');

describe('lambda-proxy policy : ignore path', () => {
  let app, axiosInstance;

  before(done => {
    prepare(CONFIG_PATH);

    gateway()
      .run()
      .then(([server]) => {
        app = server.app;

        const port = app.address().port;
        axiosInstance = axios.create({
          baseURL: `http://localhost:${port}`,
          validateStatus: status => status < 400
        });

        done();
      })
      .catch(err => {
        console.error(err);
      });
  });

  beforeEach(() => {
    awsMock.restore();
  });

  it('doesn\'t forward the URL path', () => {
    let requestPayload;

    awsMock.mock('Lambda', 'invoke', (params, callback) => {
      requestPayload = JSON.parse(params.Payload);

      callback(null, {
        Payload: JSON.stringify({
          statusCode: 200,
          body: 'Hello World'
        })
      });
    });

    return axiosInstance
      .get('/world')
      .then(res => {
        assert.strictEqual(res.status, 200);
        assert.strictEqual(requestPayload.path, '/');
      });
  });

  after(done => {
    app.close(() => done());
  });
});
