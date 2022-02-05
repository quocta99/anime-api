const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const redis = require('redis')

const router = require("./routers/index")

const app = express()

const client = redis.createClient({
    host: '127.0.0.1',
    port: 6379
})
client.on('error', (err) => console.log('Redis Client Error', err));

const port = process.env.PORT || 8080

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(logger('dev'))

app.use(router)

app.listen(port, () => {
    console.log(`App running in http://localhost:${port}`);
})