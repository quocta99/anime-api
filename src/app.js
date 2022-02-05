const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')

const router = require("./routers/index")

const app = express()
const port = process.env.PORT || 8080
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(logger('dev'))

app.use(router)

app.listen(port, () => {
    console.log(`App running in http://localhost:${port}`);
})