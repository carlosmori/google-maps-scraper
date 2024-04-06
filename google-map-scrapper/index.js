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

function saveCsvToFile(csvData, filePath) {
  fs.writeFileSync(filePath, csvData);
}

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
      { timeout: 1200000 }
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
    await page.goto(scrapIndividualResult.googleUrl, { timeout: 60000 });
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
  const potentialFarms = [
    "Cattle Farm",
    "Sheep Farm",
    "Wheat Farm",
    "Barley Farm",
    "Canola Farm",
    "Rice Farm",
    "Sugar Cane Farm",
    "Cotton Farm",
    "Citrus Farm",
    "Banana Farm",
    "Avocado Farm",
    "Mango Farm",
    "Apple Farm",
    "Pear Farm",
    "Grape Farm",
    "Almond Farm",
    "Walnut Farm",
    "Pistachio Farm",
    "Macadamia Farm",
    "Olive Farm",
    "Poultry Farm",
    "Pig Farm",
    "Fish Farm",
    "Aquaculture Farm",
    "Horticulture Farm",
    "Vegetable Farm",
    "Potato Farm",
    "Tomato Farm",
    "Carrot Farm",
    "Onion Farm",
    "Lettuce Farm",
    "Broccoli Farm",
    "Cauliflower Farm",
    "Spinach Farm",
    "Strawberry Farm",
    "Raspberry Farm",
    "Blueberry Farm",
    "Coffee Farm",
    "Tea Farm",
    "Herb Farm",
    "Flower Farm",
    "Nursery Farm",
    "Seaweed Farm",
    "Algae Farm",
    "Solar Farm",
    "Wind Farm",
    "Hydroponic Farm",
    "Hydroelectric Farm",
    "Organic Farm",
    "Permaculture Farm",
    "Agroforestry Farm",
    "Bush Tucker Farm",
    "Dairy Farm",
    "Egg Farm",
    "Honey Farm",
    "Bee Farm",
    "Mushroom Farm",
    "Ranch",
  ];
  const australianStates = [
    // "New South Wales",
    // "Queensland",
    "South Australia",
    "Tasmania",
    "Victoria",
    "Western Australia",
    "Northern Territory",
    "Australian Capital Territory",
  ];

  const combinations = [];
  for (const potentialFarm of potentialFarms) {
    for (const state of australianStates) {
      const query = `${potentialFarm} in ${state}`;
      combinations.push(query);
    }
  }
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    for (const state of australianStates) {
      const finalBusinesses = [];

      // Iterate over potential farms
      for (const farm of potentialFarms) {
        const googleMapQuery = `${farm} in ${state}`;
        console.log(`Scraping ${googleMapQuery}...`);
        const businesses = await scrapeGoogleMaps(page, googleMapQuery);

        // Scrap individual results for each business

        // const provBs = [businesses[0], businesses[1], businesses[2]];
        const trimbusinesses = businesses.splice(0, 20);
        for (const business of trimbusinesses) {
          console.log(
            `Scraping ${googleMapQuery} for particular result: ${business.storeName}...`
          );
          process.stdout.write(
            `Scraping ${googleMapQuery} for particular result: ${business.storeName}...`
          );
          const resultWithAdditionalData = await scrapIndividualResult(
            page,
            business
          );
          finalBusinesses.push(resultWithAdditionalData);

          // Delay for 2 seconds before proceeding to the next iteration
          await delay(2000);
        }
      }
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
      const csvFileName = `${state}.csv`;
      const dropboxPath = `${homeDir}/${dropboxDir}`;
      const csvFilePath = `${dropboxPath}/${csvFileName}`;
      saveCsvToFile(csvContent, csvFilePath);

      console.log(`CSV file for ${state} saved successfully.`);

      saveCsvToFile(csvContent, csvFilePath);

      console.log("Scraping finished!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await browser.close(); // Close the browser after all operations are complete
    console.log("Scraping finished!");
  }
})();
