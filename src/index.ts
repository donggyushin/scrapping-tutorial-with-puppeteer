import cheerio from 'cheerio'
import mongoose from 'mongoose'
import puppeteer from 'puppeteer'

interface scrapingResult {
  title:string 
  datePosted:string 
  neighborhood:string 
  url:string 
  jodDescription:string
  compensation:string
}

interface IListing extends mongoose.Document {
  title:string 
  datePosted:string 
  neighborhood:string 
  url:string 
  jodDescription:string
  compensation:string
}
const ListingSchema = new mongoose.Schema({
  title:String, 
  datePosted:String ,
  neighborhood:String ,
  url:String ,
  jodDescription:String,
  compensation:String
  
})

const ListingModel = mongoose.model<IListing>('Listing', ListingSchema)



const scrapeListings = async (page:puppeteer.Page) => {
  await page.goto("https://sfbay.craigslist.org/d/software-qa-dba-etc/search/sof")
  const html = await page.content()
  const $ = cheerio.load(html)
  const scrapingResults = $(".result-info").map((index, element):scrapingResult => {
    const titleElement = $(element).find("a.result-title")
    const timeElement = $(element).find("time.result-date")
    const hoodElement = $(element).find("span.result-hood")
    const title = $(titleElement).text()
    const url = $(titleElement).attr("href") || ""
    const datePosted = $(timeElement).attr("datetime") || ""
    const neighborhood = $(hoodElement).text().trim()
    return {
      title,
      url,
      datePosted,
      neighborhood,
      jodDescription:'',
      compensation:''
    }
}).get()
return scrapingResults
}

const scrapeListingsWithDescription = async (page:puppeteer.Page, listings:scrapingResult[]) => {
    for (let index = 0; index < listings.length; index++) {
      const listing = listings[index];
      await page.goto(listing.url)
      const html = await page.content()
      const $ = cheerio.load(html)
      const description = $("#postingbody").text()
      const compensation = $("body > section > section > section > div.mapAndAttrs > p > span:nth-child(1) > b").text()
      listing.jodDescription = description
      listing.compensation = compensation
      const listingData = new ListingModel(listing)
      await listingData.save()
      await sleep(2000)
    }
}

function sleep(ms:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

const main = async () => {
  await mongoose.connect('mongodb://localhost:27017/test', {useNewUrlParser: true, useUnifiedTopology: true});
  const brower = await puppeteer.launch({headless:false})
  const page = await brower.newPage()
  const listings:scrapingResult[] = await scrapeListings(page)
  scrapeListingsWithDescription(page, listings)

}

main()