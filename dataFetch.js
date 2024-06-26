import express from "express";
import bodyParser from "body-parser";
import axios from 'axios';
import env from "dotenv";
import pg from "pg"

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

// Function to insert vulnerability data into PostgreSQL tables
async function insertData(vulnerabilities) {
    for (const vulnerability of vulnerabilities) {
        try {
            // Extract necessary data for insertion
            const cveId = parseInt(vulnerability.cve.id.match(/\d+/g).join(""), 10);
            const publishedDate = vulnerability.cve.published?.substring(0, 10) || null;
            const lastModifiedDate = vulnerability.cve.lastModified?.substring(0, 10) || null;

            // Insert into cve_information table
            const cveInfoQuery = {
                text: 'INSERT INTO cve_information (cve_id, cve_name, indentifier, published_date, last_modified_date, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
                values: [
                    cveId,
                    vulnerability.cve.id,
                    vulnerability.cve.sourceIdentifier,
                    publishedDate,
                    lastModifiedDate,
                    vulnerability.cve.vulnStatus
                ]
            };
            await db.query(cveInfoQuery);

            // Insert into cve_description table
            const cveDescQuery = {
                text: 'INSERT INTO cve_description (cve_id, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                values: [
                    cveId,
                    vulnerability.cve.descriptions[0]?.value ?? null
                ]
            };
            await db.query(cveDescQuery);

            // Insert into cvss_v2_metrics table
            const cveMetricsQuery = {
              text: 'INSERT INTO cvss_v2_metrics (cve_id, severity, score, vector_string, exploitability_score, impact_score) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
              values: [
                  cveId,
                  vulnerability.cve.metrics.cvssMetricV2[0]?.baseSeverity ?? null,
                  parseFloat(vulnerability.cve.metrics.cvssMetricV2[0]?.cvssData?.baseScore) ?? null,                  
                  vulnerability.cve.metrics.cvssMetricV2[0]?.cvssData?.vectorString ?? null,
                  parseInt(vulnerability.cve.metrics.cvssMetricV2[0]?.exploitabilityScore) ?? null,
                  parseFloat(vulnerability.cve.metrics.cvssMetricV2[0]?.impactScore) ?? null
              ]
            };          
            await db.query(cveMetricsQuery);

            // Insert into cvss_data table
            const cvssDataQuery = {
                text: 'INSERT INTO cvss_data (cve_id, access_vector, access_complexity, authentication, confidentiality_impact, integrity_impact, availability_impact) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
                values: [
                    cveId,
                    vulnerability.cve.metrics.cvssMetricV2[0]?.cvssData?.accessVector ?? null,
                    vulnerability.cve.metrics.cvssMetricV2[0]?.cvssData?.accessComplexity ?? null,
                    vulnerability.cve.metrics.cvssMetricV2[0]?.cvssData?.authentication ?? null,
                    vulnerability.cve.metrics.cvssMetricV2[0]?.cvssData?.confidentialityImpact ?? null,
                    vulnerability.cve.metrics.cvssMetricV2[0]?.cvssData?.integrityImpact ?? null,
                    vulnerability.cve.metrics.cvssMetricV2[0]?.cvssData?.availabilityImpact ?? null
                ]
              };
              await db.query(cvssDataQuery);
            
            // Insert into configurations table
            for (const vulnerability of vulnerabilities) {
                const cveId = parseInt(vulnerability.cve.id.match(/\d+/g).join(""), 10);
                if(vulnerability.cve.configurations[0].nodes[0].cpeMatch.length > 0) {
                    var cpeMatch = vulnerability.cve.configurations[0].nodes[0].cpeMatch;
                    for (const config of cpeMatch) {
                        const cveRefQuery = {
                            text: 'INSERT INTO configurations (cve_id, vulnerable, criteria, match_criteria_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                            values: [
                                cveId,
                                config.vulnerable,
                                config.criteria,
                                config.matchCriteriaId
                            ]
                        };
                        await db.query(cveRefQuery);
                    }
                }
            }
        } catch (error) {
            console.error('Error inserting data:', error);
        }
    }
}

// Function to fetch data from NVD API and insert into PostgreSQL
async function fetchApiData() {
    let startIndex = 0;
    const range = 2000;

    while (true) {
        try {
            // Fetch data from the API
            const response = await axios.get(
                `https://services.nvd.nist.gov/rest/json/cves/2.0/?resultsPerPage=${range}&startIndex=${startIndex}`
            );
            if (response.data.resultsPerPage == 0) {
              break;
            }
            // Extract vulnerabilities data from the API response
            const vulnerabilities = response.data.vulnerabilities;

            // Insert data into tables for each vulnerability
            await insertData(vulnerabilities);

            startIndex += range;
        } catch (error) {
            // Handle errors
            console.error("Error :", error.message);
            throw error; // Don't throw error here
        }
    }

    console.log("Data inserted successfully");
}

// Invoke the function to start fetching data from API and inserting into PostgreSQL
fetchApiData();
