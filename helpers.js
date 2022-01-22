const { default: axios } = require('axios');
const cheerio = require('cheerio')
const _ = require('lodash')
const Buffer = require('buffer')
const FormData = require('form-data');

const MAIN_URL = 'https://animevietsub.tv/tim-kiem/'
const CATEGORY_URL = 'http://animevietsub.tv/the-loai/'

const parseAllMovie = async (req) => {
    const url = MAIN_URL + (req?.query?.keyword ? `${req?.query?.keyword}/` : '') + (req?.query?.page ? `trang-${req?.query?.page}.html` : '')

    const { data } = await axios.get(url)

    const $ = cheerio.load(data)

    return await parseListMovie($)
}

const parseListMovieByCategory = async (req) => {
    const url = CATEGORY_URL + (req?.params?.slug ? `${req?.params?.slug}/` : '') + (req?.query?.page ? `trang-${req?.query?.page}.html` : '')

    console.log({url});
    const { data } = await axios.get(url)
    const $ = cheerio.load(data)

    return await parseListMovie($)
}

const parseCategoryMovies = async (req) => {
    const { data } = await axios.get(MAIN_URL)
    const $ = cheerio.load(data)

    const categories = []
    $('#menu-item-494 ul.sub-menu li a').each((index, el) => {
        categories.push({
            key: _.get(/https:.*\/(.*?)\//g.exec($(el).attr('href')), '[1]', null),
            name: $(el).text()
        })
    })

    return categories
}

const parseListMovie = async ($) => {
    const page = $('.Top .wp-pagenavi .pages').text()
    const arrayPage = /Trang (.*) của (.*)/g.exec(page)

    let pagination = {
        current: _.get(arrayPage, '[1]', 1),
        lastPage: _.get(arrayPage, '[2]', 1),
    }

    let movies = []

    $('.MovieList .TPostMv').each((index, item) => {
        const linkDetail = $(item).find('.TPost a').attr('href') ?? ''
        const thumbnail = $(item).find('.Image img').attr('src') ?? ''
        const title = $(item).find('h2.Title').text() ?? ''
        const view = $(item).find('.Year').text() ?? ''
        const quantity = $(item).find('.TPMvCn .Info .Qlty').text() ?? ''
        const vote = $(item).find('.TPMvCn .Info .Vote').text() ?? ''
        const time = $(item).find('.TPMvCn .Info .Time').text() ?? ''
        const date = $(item).find('.TPMvCn .Info .Date').text() ?? ''
        const director = $(item).find('.TPMvCn .Description .Director').text() ?? ''

        let categories = [];
        $(item).find('.TPMvCn .Description .Genre a').each((index, el) => {
            categories.push($(el).attr('title'))
        })

        movies.push({
            id: Buffer.btoa(linkDetail),
            title,
            thumbnail,
            view,
            info: {
                quantity,
                vote,
                time,
                date
            },
            description: {
                director,
                categories
            }
        })
    })

    return { movies, pagination }
}

const parseDetailMovie = async (req) => {
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

    return {
        title,
        subTitle,
        description,
        thumbnail,
        background,
        streaming,
        episodes
    }
}

const getLinkStream = async (url) => {
    const { data } = await axios.get(url)

    const idVideo = _.get(/LoadLinksBackup\((.*[0-9])\);/g.exec(data), '[1]')
    if (!idVideo) return

    const allLink = _.get(await getAllLinkStream(idVideo), 'data.html', '')
    let $ = cheerio.load(allLink)

    let links = []
    $(".btn3dsv").each((index, el) => {
        links.push({
            id: $(el).data('id'),
            play: $(el).data('play'),
            href: $(el).data('href'),
            name: $(el).text()
        })
    })

    let linkStreams = []
    for (const link of links) {
        const response = _.get(await getCdnLinkStream(link.href, link.play), 'data', null)
        linkStreams.push({
            id: link.id,
            name: link.name,
            links: response
        })
    }
    return linkStreams;
}

const getEpisodes = async (url) => {
    const { data } = await axios.get(url)
    const $ = cheerio.load(data)

    let episodes = []
    $('#list-server .list-episode .episode:not(.playing)').each((index, item) => {
        episodes.push({
            name: $(item).find('.episode-link').text(),
            hash: $(item).find('.episode-link').data('hash'),
            play: $(item).find('.episode-link').data('play'),
        })
    })

    return episodes;
}

const getAllLinkStream = (idVideo) => {
    return new Promise((resolve, reject) => {
        const data = new FormData();
        data.append('episodeId', idVideo);
        data.append('backup', '1');

        const config = {
            method: 'post',
            url: 'http://animevietsub.tv/ajax/player?v=2019a',
            headers: {
                'Cookie': 'tokenc684ac54f5b46d5f162650d983c90236=338c77867de23be3982a916e73fbda21; PHPSESSID=675dnr8ov4lhui8rg1ibtosj13',
                ...data.getHeaders()
            },
            data: data
        };

        axios(config)
            .then((response) => {
                resolve(response)
            })
            .catch((error) => {
                reject(error)
            });
    })
}

const getCdnLinkStream = (link, play) => {
    return new Promise((resolve, reject) => {
        const data = new FormData();
        data.append('link', link);
        data.append('play', play);
        data.append('backuplinks', ' 1');

        var config = {
            method: 'post',
            url: 'http://animevietsub.tv/ajax/player?v=2019a',
            headers: {
                'Cookie': 'token602554790dac6400887f8541ed49f893=237675ed697e5e6c03c433cecf00de36; tokenc684ac54f5b46d5f162650d983c90236=338c77867de23be3982a916e73fbda21; PHPSESSID=675dnr8ov4lhui8rg1ibtosj13',
                ...data.getHeaders()
            },
            data: data
        };

        axios(config)
            .then(function (response) {
                resolve(response)
            })
            .catch(function (error) {
                reject(error)
            });

    })
}

const convertStreaming = async (req) => {
    console.log(req?.query?.key);
    return await axios.get(req?.query?.key)
}

const fullUrl = (req) => {
    return req.protocol + '://' + req.get('host') + req.originalUrl;
}

module.exports = {
    parseAllMovie,
    parseDetailMovie,
    parseCategoryMovies,
    getCdnLinkStream,
    convertStreaming,
    parseListMovieByCategory,
    fullUrl
}