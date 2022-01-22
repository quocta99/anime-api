const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const { parseAllMovie, parseDetailMovie, parseCategoryMovies, parseListMovieByCategory, getCdnLinkStream, convertStreaming, fullUrl } = require('./helpers')
const _ = require('lodash')
const redis = require('redis')

const app = express()
const client = redis.createClient({
    host: 'redis-server',
    port: 6379
})
client.on('error', (err) => console.log('Redis Client Error', err));

const port = process.env.PORT || 8080

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use(logger('dev'))

app.get('/streaming.m3u8', async (req, res) => {
    const response = await convertStreaming(req)
    res.send(response.data)
})

app.get('/movies', async (req, res) => {
    const moviesRedisKey = 'user:movies';
    return client.get(moviesRedisKey, (err, movies) => {
        if (movies) {
            return res.json({ source: 'cache', data: JSON.parse(movies) })
        } else { // Key does not exist in Redis store
            parseAllMovie(req).then(movies => {
                client.setex(moviesRedisKey, 3600, JSON.stringify(movies))
                return res.json({ source: 'api', data: movies })
            })
        }
    });
})

app.get('/movies/categories', async (req, res) => {
    const data = await parseCategoryMovies(req)
    res.json({
        message: 'Loaded successfully!',
        error: false,
        data
    })
})

app.get('/movies/streaming/:hash', async (req, res) => {
    const data = await getCdnLinkStream(req.params.hash, 'api')
    res.json({
        message: 'Loaded successfully!',
        error: false,
        data: _.get(data, 'data.link', {})
    })
})

app.get('/movies/categories/:slug', async (req, res) => {
    const data = await parseListMovieByCategory(req)
    res.json({
        data
    })
})

app.get('/movies/:id', async (req, res) => {
    const data = await parseDetailMovie(req)
    res.json({
        data
    })
})

app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
    console.log(`App running in http://localhost:${port}`);
})