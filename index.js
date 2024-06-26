// Import necessary packages
import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import pg from "pg";

// Initialize Express application
const app = express();
const port = 3000;
env.config();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Initialize PostgreSQL client
const db = new pg.Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.AUTH,
    password: process.env.PASSWORD,
    port: process.env.PORT,
});
db.connect();

// Function to fetch rows from database with given index range
async function fetchRowsFromDatabaseWithIndex(start, end) {
  const result = await db.query(
    "SELECT * FROM cve_information WHERE id BETWEEN $1 AND $2;",
    [start, end]
  );
  return result;
}

// Root endpoint redirects to CVEs list endpoint
app.get("/", (req, res) => {
  res.redirect("/cves/list");
});

// Endpoint to display list of CVEs with pagination
app.get("/cves/list", async (req, res) => {
  // Initialize start and end index for pagination
  let start = 0;
  let end = 20;
  try {
    // Fetch rows from database within the specified range
    const result1 = await fetchRowsFromDatabaseWithIndex(start, end);
    // Count total number of rows in the database
    const result2 = await db.query(
      "SELECT COUNT(*) FROM cve_information;"
    );
    // Render table view template with retrieved data and total count
    res.render("table.ejs", { data: result1.rows , length: result2.rows[0].count });
  } catch (error) {
    console.log("Error:", error);
  }
});

// Endpoint to search for CVE by CVE ID
app.get("/cveID/search", async (req, res) => {
  // Parse search input as integer
  const searchInput = parseInt(req.query.searchInput);
  try {
    // Query database for CVE information matching the given CVE ID
    const result1 = await db.query(
      "SELECT * FROM cve_information WHERE cve_id = $1;",
      [searchInput]
    );
    // Count total number of rows in the database
    const result2 = await db.query(
      "SELECT COUNT(*) FROM cve_information;"
    );
    // Render table view template with retrieved data and total count
    res.render("table.ejs", { data: result1.rows, length: result2.rows[0].count }); 
  } catch (error) {
    console.log("Error:", error);
  }
});

// Endpoint to set number of records per page
app.get("/cves/records-per-page", async (req, res) => {
  // Parse number of records per page as integer
  const recordsPerPage = parseInt(req.query.recordsPerPage);
  // Set end index for pagination based on start index and records per page
  const end = start + recordsPerPage;
  // Fetch rows from database within the specified range
  const result1 = await fetchRowsFromDatabaseWithIndex(start, end);
  // Count total number of rows in the database
  const result2 = await db.query(
    "SELECT COUNT(*) FROM cve_information;"
  );
  // Render table view template with retrieved data and total count
  res.render("table.ejs", { data: result1.rows , length: result2.rows[0].count });
});

// Endpoint to navigate through pagination
app.get("/cves/pagination", async (req, res) => {
  // Get page type (Next or Previous) from query parameters
  const pageType = req.query.Pagetype;
  // Adjust start and end index based on page type
  if (pageType === "Next") {
    start = end + 1;
    end += 20;
  } else if(pageType === "Previous") {
    end = start;
    start -= 20;
    if (start < 0) {
      // If start index is less than 0, reset pagination to first page
      start = 1;
      end = 20;
    }
  }
  // Fetch rows from database within the specified range
  const result1 = await fetchRowsFromDatabaseWithIndex(start, end);
  // Count total number of rows in the database
  const result2 = await db.query(
    "SELECT COUNT(*) FROM cve_information;"
  );
  // Render table view template with retrieved data and total count
  res.render("table.ejs", { data: result1.rows , length: result2.rows[0].count });
});

// Endpoint to display detailed information of a CVE
app.get("/cveID/data", async (req, res) => {
  // Parse CVE ID from query parameters
  const searchInput = parseInt(req.query.cve_id);
  try {
    // Query database for detailed CVE information based on CVE ID
    const result1 = await db.query(
        `SELECT cve_information.cve_name,
        cve_description.description,
        cvss_v2_metrics.severity,
        cvss_v2_metrics.score,
        cvss_v2_metrics.vector_string,
        cvss_v2_metrics.exploitability_score,
        cvss_v2_metrics.impact_score,
        cvss_data.access_vector,
        cvss_data.access_complexity,
        cvss_data.authentication,
        cvss_data.confidentiality_impact,
        cvss_data.integrity_impact,
        cvss_data.availability_impact
        FROM cve_information
        LEFT JOIN cve_description ON cve_information.cve_id = cve_description.cve_id
        LEFT JOIN cvss_v2_metrics ON cve_information.cve_id = cvss_v2_metrics.cve_id
        LEFT JOIN cvss_data ON cve_information.cve_id = cvss_data.cve_id
        WHERE cve_information.cve_id = $1;`,
        [searchInput]
    );
    // Query database for CVE configurations based on CVE ID
    const result2 = await db.query(
      `SELECT configurations.vulnerable, configurations.criteria, configurations.match_criteria_id
      FROM cve_information
      JOIN configurations ON cve_information.cve_id = configurations.cve_id
      WHERE cve_information.cve_id = $1`,
      [searchInput]
    );
    // Render detailed view template with retrieved data
    res.render('detail.ejs', { cve_details: result1.rows[0], criteria: result2.rows });
  } catch (error) {
      console.error("Error fetching data:", error);
  }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
