// Schema definition for the Skill Graph
// Nodes:
//   (:Skill {id: Integer, name: String, description: String})
//
// Relationships:
//   (:Skill)-[:PREREQUISITE_OF]->(:Skill)

// Example query to find all prerequisites for a skill:
// MATCH (pre:Skill)-[:PREREQUISITE_OF]->(s:Skill {name: $skill_name}) RETURN pre;
