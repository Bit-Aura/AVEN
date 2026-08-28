const fs = require('fs');
fetch('http://localhost:8000/api/v1/roadmaps/backend')
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
