"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = __importDefault(require("cheerio"));
const mongoose_1 = __importDefault(require("mongoose"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const ListingSchema = new mongoose_1.default.Schema({
    title: String,
    datePosted: String,
    neighborhood: String,
    url: String,
    jodDescription: String,
    compensation: String
});
const ListingModel = mongoose_1.default.model('Listing', ListingSchema);
const scrapeListings = (page) => __awaiter(void 0, void 0, void 0, function* () {
    yield page.goto("https://sfbay.craigslist.org/d/software-qa-dba-etc/search/sof");
    const html = yield page.content();
    const $ = cheerio_1.default.load(html);
    const scrapingResults = $(".result-info").map((index, element) => {
        const titleElement = $(element).find("a.result-title");
        const timeElement = $(element).find("time.result-date");
        const hoodElement = $(element).find("span.result-hood");
        const title = $(titleElement).text();
        const url = $(titleElement).attr("href") || "";
        const datePosted = $(timeElement).attr("datetime") || "";
        const neighborhood = $(hoodElement).text().trim();
        return {
            title,
            url,
            datePosted,
            neighborhood,
            jodDescription: '',
            compensation: ''
        };
    }).get();
    return scrapingResults;
});
const scrapeListingsWithDescription = (page, listings) => __awaiter(void 0, void 0, void 0, function* () {
    for (let index = 0; index < listings.length; index++) {
        const listing = listings[index];
        yield page.goto(listing.url);
        const html = yield page.content();
        const $ = cheerio_1.default.load(html);
        const description = $("#postingbody").text();
        const compensation = $("body > section > section > section > div.mapAndAttrs > p > span:nth-child(1) > b").text();
        listing.jodDescription = description;
        listing.compensation = compensation;
        const listingData = new ListingModel(listing);
        yield listingData.save();
        yield sleep(2000);
    }
});
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
    const brower = yield puppeteer_1.default.launch({ headless: false });
    const page = yield brower.newPage();
    const listings = yield scrapeListings(page);
    scrapeListingsWithDescription(page, listings);
});
main();
