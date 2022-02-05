const { default: axios } = require('axios');
const cheerio = require('cheerio')
const _ = require('lodash')
const Buffer = require('buffer')

axios.defaults.headers.common = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36"
};

const { parseListMovie, getLinkStream, getEpisodes, getCdnLinkStream } = require('../services/MovieService');

const MAIN_URL = 'https://animevietsub.tv/tim-kiem/'
const CATEGORY_URL = 'http://animevietsub.tv/the-loai/'

exports.findAllMovies = async (req, res) => {
    const url = MAIN_URL + (req?.query?.keyword ? `${req?.query?.keyword}/` : '') + (req?.query?.page ? `trang-${req?.query?.page}.html` : '')
    const { data } = await axios.get(url)
    const $ = cheerio.load(data)
    const movies = await parseListMovie($)
    res.json({
        data: movies
    })
}

exports.findAllCategories = async (req, res) => {
    const { data } = await axios.get(MAIN_URL)
    const $ = cheerio.load(data)

    const categories = []
    $('#menu-item-494 ul.sub-menu li a').each((index, el) => {
        categories.push({
            key: _.get(/https:.*\/(.*?)\//g.exec($(el).attr('href')), '[1]', null),
            name: $(el).text()
        })
    })
    res.json({
        data: categories
    })
}

exports.findMoviesByCategory = async (req, res) => {
    const url = CATEGORY_URL + (req?.params?.slug ? `${req?.params?.slug}/` : '') + (req?.query?.page ? `trang-${req?.query?.page}.html` : '')
    const { data } = await axios.get(url)
    const $ = cheerio.load(data)

    const movies = await parseListMovie($)
    res.json({
        data: movies
    })
}

exports.findMovieById = async (req, res) => {
    const url = Buffer.atob(req?.params?.id)
    const { data } = await axios(url)

    const $ = cheerio.load(data)

    const title = $('.TPost.Single .Title').text()
    const subTitle = $('.TPost.Single .SubTitle').text()
    const description = $('.TPost.Single .Description').text().trim()
    const thumbnail = $(".TPost.Single .Objf img").attr('src')
    const background = $('.TPostBg img.TPostBg').attr('src')

    const linkWatch = $('.TPost.Single .watch_button_more').attr("href")

    const streaming = await getLinkStream(linkWatch)
    const episodes = await getEpisodes(linkWatch)

    res.json({
        data: {
            title,
            subTitle,
            description,
            thumbnail,
            background,
            streaming,
            episodes
        }
    })
}

exports.findStreamingByHash = async (req, res) => {
    const response = await getCdnLinkStream(req.params.hash, 'api')
    res.json({
        data: _.get(response, 'data.link', {})
    })
}

exports.streamingByHash = async (req, res) => {
    return await axios.get(req?.query?.key)
}