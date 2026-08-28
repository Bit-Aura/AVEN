const fs = require('fs');
const skills = JSON.parse(fs.readFileSync('backend_data.json')).skills;
// ... I don't have backend_data.json with skills, I only have graph endpoint.
