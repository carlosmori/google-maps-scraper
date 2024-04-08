const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const fs = require("fs");
const os = require("os");
const homeDir = os.homedir();
const dropboxDir = "Dropbox";

puppeteerExtra.use(StealthPlugin());

async function launchBrowser() {
  return await puppeteerExtra.launch({
    headless: false,
    args: ["--no-sandbox"],
  });
}

function saveCsvToFile(finalBusinesses, fileName) {
  let csvContent = `\"Store Name\",\"Website Link\",\"Business Website\",\"Phone Number\",\"Stars\",\"Number of Reviews\",\"Rating Text\",\"Address\",\"Place ID\",\"Category\",\"Google URL\"\n`;
  finalBusinesses.forEach((business) => {
    const storeName = business.storeName
      ? `"${business.storeName.replace(/\"/g, '""')}"`
      : "";
    const websiteLink = business.websiteLink
      ? `"${business.websiteLink.replace(/\"/g, '""')}"`
      : "";
    const bizWebsite = business.bizWebsite
      ? `"${business.bizWebsite.replace(/\"/g, '""')}"`
      : "";
    const phoneNumber = business.phoneNumber
      ? `"${business.phoneNumber.replace(/\"/g, '""')}"`
      : "";
    const stars = business.stars || "";
    const numberOfReviews = business.numberOfReviews || "";
    const ratingText = business.ratingText
      ? `"${business.ratingText.replace(/\"/g, '""')}"`
      : "";
    const address = business.address
      ? `"${business.address.replace(/\"/g, '""')}"`
      : "";
    const placeId = business.placeId
      ? `"${business.placeId.replace(/\"/g, '""')}"`
      : "";
    const category = business.category
      ? `"${business.category.replace(/\"/g, '""')}"`
      : "";
    const googleUrl = business.googleUrl
      ? `"${business.googleUrl.replace(/\"/g, '""')}"`
      : "";

    csvContent += `${storeName},${websiteLink},${bizWebsite},${phoneNumber},${stars},${numberOfReviews},${ratingText},${address},${placeId},${category},${googleUrl}\n`;
  });
  const csvFileName = `${fileName}.csv`;
  const dropboxPath = `${homeDir}/${dropboxDir}`;
  const csvFilePath = `${dropboxPath}/${csvFileName}`;

  fs.writeFileSync(csvFilePath, csvContent);
}

async function scrollToBottom(page) {
  const wrapper = await page.$('div[role="feed"]');
  let totalHeight = 0;
  const distance = 1000;
  const scrollDelay = 2000;

  while (true) {
    const scrollHeightBefore = await page.evaluate(
      (el) => el.scrollHeight,
      wrapper
    );
    await wrapper.evaluate(
      (el, distance) => el.scrollBy(0, distance),
      distance
    );
    totalHeight += distance;

    if (totalHeight >= scrollHeightBefore) {
      totalHeight = 0;
      await new Promise((resolve) => setTimeout(resolve, scrollDelay));

      const scrollHeightAfter = await page.evaluate(
        (el) => el.scrollHeight,
        wrapper
      );

      if (scrollHeightAfter === scrollHeightBefore) {
        break;
      }
    }
  }
}
async function waitForPageLoad(page) {
  // Wait until the 'load' event is fired, indicating that the page has finished loading
  await page.waitForNavigation({ waitUntil: "domcontentloaded" });

  // Alternatively, you can wait for a specific element to appear on the page
  // Example: await page.waitForSelector('your-selector');
}

async function scrapeGoogleMaps(page, query) {
  console.log("starting scrapper!");
  try {
    await page.goto(
      `https://www.google.com/maps/search/${query.split(" ").join("+")}`,
      { timeout: 1800000 }
    );
    await waitForPageLoad(page);
    await scrollToBottom(page);

    const html = await page.content();
    const $ = await import("cheerio").then((m) => m.load(html));
    const businesses = $('a[href*="/maps/place/"]')
      .map((_, el) => {
        const $parent = $(el).parent();
        const $ratingSpan = $parent.find("span.fontBodyMedium > span");
        const $bodyDiv = $parent.find("div.fontBodyMedium").first();
        const $children = $bodyDiv.children();
        const $lastChild = $children.last();
        const $firstOfLast = $lastChild.children().first();
        const $lastOfLast = $lastChild.children().last();

        const [stars, reviews] =
          $ratingSpan.attr("aria-label")?.split(" stars ") || [];
        const [phone] = $lastOfLast.text().split("·") || [];

        return {
          placeId: `ChI${$(el).attr("href").split("?")[0].split("ChI")[1]}`,
          address: $firstOfLast.text().split("·")[1]?.trim(),
          category: $firstOfLast.text().split("·")[0]?.trim(),
          phone: phone?.trim(),
          googleUrl: $(el).attr("href"),
          storeName: $parent.find("div.fontHeadlineSmall").text(),
          ratingText: $ratingSpan.attr("aria-label"),
          stars: stars ? Number(stars.trim()) : null,
          numberOfReviews: reviews
            ? Number(reviews.replace("Reviews", "").trim())
            : null,
        };
      })
      .get();

    console.log(`scrapped ${businesses.length} !`);
    return businesses;
  } catch (error) {
    console.error("Error:", error.message);
    return [];
  }
}

async function scrapIndividualResult(page, scrapIndividualResult) {
  try {
    await page.goto(scrapIndividualResult.googleUrl, { timeout: 1800000 });
    await waitForPageLoad(page);

    const html = await page.content();
    const $ = cheerio.load(html);
    const websiteLink = $('a[data-item-id="authority"]').attr("href");
    const phoneNumber = $('[aria-label*="Phone"]').text();
    return {
      ...scrapIndividualResult,
      websiteLink,
      phoneNumber,
    };
  } catch (error) {
    console.error("Error:", error.message);
    return [];
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const locations = [
    "Madrid",
    "Barcelona",
    "Valencia",
    "Sevilla",
    "Zaragoza",
    "Málaga",
    "Murcia",
    "Palma de Mallorca",
    "Las Palmas de Gran Canaria",
    "Bilbao",
    "Alicante",
    "Córdoba",
    "Valladolid",
    "Vigo",
    "Gijón",
    "Hospitalet de Llobregat",
    "A Coruña",
    "Vitoria-Gasteiz",
    "Granada",
    "Elche",
    "Australian Capital Territory",
    "Western",
    "Northen Territory",
  ];
  const niches = [
    // "Dentista",
    "Carpintería Metálica",
    "Fontanería",
    "Electricidad",
    "Reforma de Hogar",
    "Construcción",
    "Tienda de Ropa",
    "Restaurante",
    "Cafetería",
    "Peluquería",
    "Clínica Dental",
    "Tienda de Electrónica",
    "Tienda de Muebles",
    "Supermercado",
    "Gimnasio",
    "Centro de Belleza",
    "Lavandería",
    "Tienda de Bicicletas",
    "Centro de Jardinería",
    "Floristería",
    "Agencia de Viajes",
  ];

  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    // await page.setRequestInterception(true);
    // page.on("request", (req) => {
    //   if (["image", "stylesheet", "font"].includes(req.resourceType())) {
    //     req.abort();
    //   } else {
    //     req.continue();
    //   }
    // });

    let finalBusinesses = [];
    for (const niche of niches) {
      for (const location of locations) {
        const query = `${niche} en ${location} España`;
        const businesses = await scrapeGoogleMaps(page, query);
        // const trimbusinesses = businesses.splice(0, 2);
        for (const business of businesses) {
          console.log(
            `Scraping ${query} for particular result: ${business.storeName}...`
          );
          process.stdout.write(
            `Scraping ${query} for particular result: ${business.storeName}...`
          );
          const resultWithAdditionalData = await scrapIndividualResult(
            page,
            business
          );
          finalBusinesses.push(resultWithAdditionalData);
          await delay(3000);
        }
        const transformedNiche = niche.replace(/ /g, "-");
        const fileName = `${transformedNiche}-en-${location}`;
        saveCsvToFile(finalBusinesses, fileName);
        finalBusinesses = [];
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await browser.close(); // Close the browser after all operations are complete
    console.log("Scraping finished!");
  }
})();

const saveResult = () => {};
