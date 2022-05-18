const urlModel = require("../models/urlShortModel");
const shortId = require("shortid");
const { response } = require("express");

const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  17520,
  "redis-17520.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("zlIq8LOZY4VAd7O2H1G53cr9P9G9tFf5", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});

//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
};

const isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0;
};

const shortUrl = async function (req, res) {
    try {
        if (!isValidRequestBody(req.body)) {
            return res.status(400).send({ status: false, message: "Please provide details" })
        }
        let { longUrl } = req.body
        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, message: "Please provide longUrl" })
        }
        if (!validUrl.isUri(longUrl)) {
            return res.status(400).send('Invalid base URL')
        }
        let check = await urlModel.findOne({ longUrl: longUrl })
        if (check) {
            return res.status(409).send({ status: false, message: "longUrl already exist" })
        }
        const urlCode = shortid.generate(longUrl)
        let url = await urlModel.findOne({ urlCode: urlCode })
        if (url) {
            return res.status(409).send({ status: false, message: "longUrl already exist" })
        }
        const shortUrl = baseUrl + '/' + urlCode
        const newUrl = { longUrl, shortUrl, urlCode }
        const short = await urlModel.create(newUrl)
        return res.status(201).send({ status: true, data: short })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }

}

const getShortUrl = async function (req, res) {
    try {
        let cahcedUrleData = await GET_ASYNC(`${req.params.urlCode}`)
        if (cahcedUrleData) { return res.status(302).redirect(cahcedUrleData.longUrl) }
        let urlCode = req.params.urlCode
        let url = await urlModel.findOne({ urlCode: urlCode })
        console.log(url)
        if (url) {
            return res.status(302).redirect(url.longUrl)
        }
        return res.status(404).send({ status: false, message: "url not found" })
        await SET_ASYNC(`${req.params.urlCode}`, JSON.stringify(url),)
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

module.exports = { shortUrl, getShortUrl }