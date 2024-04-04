const ExcelJS = require("exceljs");
const fs = require("fs");

// Leer los archivos Excel
async function readExcelFile(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1); // Assuming the first worksheet is the one you want to read
    const city = getCityName(filePath);
    const rows = worksheet.getRows();
    const data = rows.map((row) => row.values);
    return { city, data };
  } catch (error) {
    console.log(error);
    return { city: "", data: [] };
  }
}

// Function to extract city name from file path
function getCityName(filePath) {
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  const cityName = fileName.split(".")[0];
  return cityName || "Unknown"; // Return "Unknown" if city name extraction fails
}

// Remove duplicates from data and track which file had duplicates removed
function removeDuplicatesAndTrack(data, city, duplicates) {
  const uniqueSet = new Set();
  return data.filter((item) => {
    const websiteLink = item[1]; // Assuming the second column contains the Website Link
    if (uniqueSet.has(websiteLink)) {
      console.log(`Duplicated record found in ${city} file: ${websiteLink}`);
      duplicates.push({ city, websiteLink });
      return false;
    } else {
      uniqueSet.add(websiteLink);
      return true;
    }
  });
}

// Write data to a new Excel file
async function writeExcelFile(data, city, outputDir) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");
  data.forEach((row) => worksheet.addRow(row));
  const outputFile = `${outputDir}/${city}_Sanitized.xlsx`;
  await workbook.xlsx.writeFile(outputFile);
  console.log(`Sanitized data for ${city} written to ${outputFile}`);
}

async function main() {
  const filePaths = [
    "Brisbane.xlsx",
    "Melbourne.xlsx",
    "Perth.xlsx",
    "Sydney.xlsx",
  ];

  // Step 1: Read all data
  const allData = [];
  for (const filePath of filePaths) {
    const { city, data } = await readExcelFile(filePath);
    allData.push({ city, data });
  }

  // Step 2: Merge data
  let mergedData = [];
  for (const { data } of allData) {
    mergedData = [...mergedData, ...data];
  }

  // Step 3: Remove duplicates and split data
  const duplicates = [];
  const splitData = {};
  for (const { city, data } of allData) {
    const otherCitiesData = allData.filter((item) => item.city !== city);
    let uniqueData = mergedData;
    for (const { city: otherCity, data: otherData } of otherCitiesData) {
      uniqueData = removeDuplicatesAndTrack(uniqueData, otherCity, duplicates);
    }
    splitData[city] = uniqueData.filter((item) => item[0] === city);
  }

  // Step 4: Write files
  for (const city of Object.keys(splitData)) {
    await writeExcelFile(splitData[city], city, ".");
  }

  console.log(
    "Duplicated records removed and data written to city-specific files."
  );
  console.log("Duplicate removal details:", duplicates);
}

main().catch((error) => console.error(error));
