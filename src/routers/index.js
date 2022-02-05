const express = require('express')
const router = express.Router()

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger/index.json');

const { findAllMovies, findAllCategories, findMoviesByCategory, findMovieById, findStreamingByHash, streamingByHash } = require("../controllers/MovieController");
const HeaderMiddleware = require('../middlewares/HeaderMiddleware');

router.use(HeaderMiddleware);

router.get('/movies', findAllMovies)
router.get('/movies/streaming.m3u8', streamingByHash)
router.get('/movies/streaming/:hash', findStreamingByHash)
router.get('/movies/categories', findAllCategories)
router.get('/movies/categories/:slug', findMoviesByCategory)
router.get('/movies/:id', findMovieById)

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

module.exports = router