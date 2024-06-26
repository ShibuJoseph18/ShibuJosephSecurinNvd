-- Table to store Common Vulnerabilities and Exposures (CVE) information
CREATE TABLE cve_information (
    id SERIAL, -- Unique identifier for each record
    cve_id INTEGER PRIMARY KEY, -- Unique identifier for the CVE
    cve_name TEXT NULL, -- Name or title of the CVE
    indentifier TEXT NULL, -- Identifier or source of the CVE
    published_date DATE NULL, -- Date when the CVE was published
    last_modified_date DATE NULL, -- Date when the CVE was last modified
    status TEXT NULL -- Status of the CVE (e.g., "Draft", "Published", "Obsolete")
);

-- Table to store descriptions of CVEs
CREATE TABLE cve_description (
    cve_id INTEGER REFERENCES cve_information(cve_id) NOT NULL UNIQUE, -- Foreign key referencing the CVE ID
    description TEXT NULL -- Description of the CVE
);

-- Table to store Common Vulnerability Scoring System (CVSS) version 2 metrics
CREATE TABLE cvss_v2_metrics (
    cve_id INTEGER REFERENCES cve_information(cve_id) NOT NULL UNIQUE, -- Foreign key referencing the CVE ID
    severity TEXT NULL, -- Severity level of the vulnerability (e.g., "Low", "Medium", "High")
    score FLOAT NULL, -- CVSS score of the vulnerability
    vector_string TEXT NULL, -- Vector string representation of the CVSS score
    exploitability_score INT NULL, -- Exploitability score of the vulnerability
    impact_score FLOAT NULL -- Impact score of the vulnerability
);

-- Table to store additional CVSS data related to vulnerabilities
CREATE TABLE cvss_data (
    cve_id INTEGER REFERENCES cve_information(cve_id) NOT NULL UNIQUE, -- Foreign key referencing the CVE ID
    access_vector TEXT NULL, -- Access vector of the vulnerability
    access_complexity TEXT NULL, -- Access complexity of the vulnerability
    authentication TEXT NULL, -- Authentication required to exploit the vulnerability
    confidentiality_impact TEXT NULL, -- Confidentiality impact of the vulnerability
    integrity_impact TEXT NULL, -- Integrity impact of the vulnerability
    availability_impact TEXT NULL -- Availability impact of the vulnerability
);

-- Table to store configurations related to vulnerabilities
CREATE TABLE configurations (
    cve_id INTEGER REFERENCES cve_information(cve_id) NOT NULL, -- Foreign key referencing the CVE ID
    vulnerable TEXT NULL, -- Indicates whether the configuration is vulnerable or not
    criteria TEXT NULL, -- Criteria used for matching the configuration
    match_criteria_id TEXT NULL -- Match criteria ID for the configuration
);
