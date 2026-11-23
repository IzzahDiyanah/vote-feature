-- Runs once, the first time the Postgres container is created.
-- The automated tests use their own database so they never touch your dev data.
CREATE DATABASE featurevote_test;
