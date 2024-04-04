const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const fs = require("fs");
const os = require("os");
const homeDir = os.homedir();
const dropboxDir = "Dropbox";

// Function to save CSV data to file
function saveCsvToFile(csvData, filePath) {
  fs.writeFileSync(filePath, csvData);
}

// const ExcelJS = require("exceljs");

puppeteerExtra.use(StealthPlugin());

async function scrollToBottom(page) {
  const wrapper = await page.$('div[role="feed"]');
  let totalHeight = 0;
  const distance = 1000;
  const scrollDelay = 3000;

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

async function scrapeGoogleMaps(query) {
  const browser = await puppeteerExtra.launch({
    headless: false,
    args: ["--no-sandbox"],
  });
  console.log("starting scrapper!");
  const page = await browser.newPage();
  try {
    await page.goto(
      `https://www.google.com/maps/search/${query.split(" ").join("+")}`,
      { timeout: 1200000 }
    );
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

    await browser.close();
    console.log(`scrapped ${businesses.length} !`);
    return businesses;
  } catch (error) {
    console.error("Error:", error.message);
    await browser.close();
    return [];
  }
}

async function scrapIndividualResult(scrapIndividualResult) {
  const browser = await puppeteerExtra.launch({
    headless: false,
    args: ["--no-sandbox"],
  });
  // executablePath:
  //   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // Ruta al ejecutable de Chrome en tu sistema
  const page = await browser.newPage();
  try {
    await page.goto(scrapIndividualResult.googleUrl, { timeout: 60000 });
    const html = await page.content();
    const $ = cheerio.load(html);
    const websiteLink = $('a[data-item-id="authority"]').attr("href");
    const phoneNumber = $('[aria-label*="Phone"]').text();
    await browser.close();
    return {
      ...scrapIndividualResult,
      websiteLink,
      phoneNumber,
    };
  } catch (error) {
    console.error("Error:", error.message);
    await browser.close();
    return [];
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const potentialFarms = [
    "Strawberry Farm",
    "Grape Farm",
    "Cattle Farm",
    "Dairy Farm",
    "Sheep Farm",
    "Poultry Farm",
    "Aquaculture Farm",
    "Vegetable Farm",
    "Grain Farm",
    "Nut Farm",
    "Olive Farm",
    "Tea Plantation",
    "Coffee Plantation",
    "Soybean Farm",
    "Corn Farm",
    "Rice Farm",
    "Wheat Farm",
    "Barley Farm",
    "Canola Farm",
    "Almond Farm",
    "Hazelnut Farm",
    "Pistachio Farm",
    "Macadamia Farm",
    "Cashew Farm",
    "Peanut Farm",
    "Sunflower Farm",
    "Cotton Farm",
    // "Sugarcane Farm",
    // "Banana Farm",
    // "Pineapple Farm",
    // "Mango Farm",
    // "Avocado Farm",
    // "Citrus Farm",
    // "Apple Farm",
    // "Pear Farm",
    // "Cherry Farm",
    // "Blueberry Farm",
    // "Raspberry Farm",
    // "Blackberry Farm",
    // "Cranberry Farm",
    // "Gooseberry Farm",
    // "Honey Farm",
    // "Fish Farm",
    // "Shrimp Farm",
    // "Salmon Farm",
    // "Trout Farm",
    // "Tilapia Farm",
    // "Catfish Farm",
    // "Oyster Farm",
    // "Clam Farm",
    // "Mussel Farm",
    // "Lobster Farm",
    // "Crab Farm",
    // "Scallop Farm",
    // "Abalone Farm",
    // "Seaweed Farm",
    // "Herb Farm",
    // "Flower Farm",
    // "Bonsai Farm",
    // "Nursery",
    // "Hydroponic Farm",
    // "Mushroom Farm",
    // "Alpaca Farm",
    // "Emu Farm",
    // "Kangaroo Farm",
    // "Crocodile Farm",
    // "Worm Farm",
    // "Snail Farm",
    // "Bee Farm",
    // "Silkworm Farm",
    // "Algae Farm",
    // "Frog Farm",
    // "Game Farm",
    // "Deer Farm",
    // "Buffalo Farm",
    // "Goat Farm",
    // "Rabbit Farm",
    // "Pheasant Farm",
    // "Quail Farm",
    // "Duck Farm",
    // "Turkey Farm",
    // "Guinea Fowl Farm",
    // "Pigeon Farm",
    // "Bison Farm",
    // "Llama Farm",
    // "Yak Farm",
    // "Horse Farm",
    // "Donkey Farm",
    // "Camel Farm",
    // "Elephant Farm",
    // "Exotic Animal Farm",
    // "Petting Zoo",
  ];
  const states = [
    "New South Wales",
    "Queensland",
    "South Australia",
    "Tasmania",
    "Victoria",
    "Western Australia",
    "Northern Territory",
    "Australian Capital Territory",
  ];

  const combinations = [];
  for (const potentialFarm of potentialFarms) {
    for (const state of states) {
      const query = `${potentialFarm} in ${state}`;
      combinations.push(query);
    }
  }
  try {
    for (const query of combinations) {
      const googleMapQuery = query; // Concatena todos los argumentos después del nombre del script
      const csvFileName = googleMapQuery.replace(/\s+/g, "-");
      console.log(googleMapQuery);
      const businesses = await scrapeGoogleMaps(googleMapQuery);
      const finalBusinesses = [];
      const provBs = [businesses[0], businesses[1], businesses[2]];
      for (const element of provBs) {
        console.log(`scrapping individual bussines!!`);
        const resultWithAdditionalData = await scrapIndividualResult(element);
        finalBusinesses.push(resultWithAdditionalData);
        // Delay for 2 seconds before proceeding to the next iteration
        await delay(1000); // Adjust the delay time as needed
      }
      // createExcel(finalBusinesses, "Carpinteria-metalica-Granada.xlsx");
      console.log(finalBusinesses);
      // Convert finalBusinesses to CSV format
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
      const dropboxPath = `${homeDir}/${dropboxDir}`;
      const csvFilePath = `${dropboxPath}/${csvFileName}.csv`;

      saveCsvToFile(csvContent, csvFilePath);

      console.log("Scraping finished!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
