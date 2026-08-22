// Constraints for Skill Graph database schema
CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT skill_name_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE;
