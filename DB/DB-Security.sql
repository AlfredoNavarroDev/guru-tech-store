-- -------------------------------------------------------------
-- Usuario de solo lectura para el Chatbot IA
-- -------------------------------------------------------------

CREATE USER chatbot_ro WITH PASSWORD '<password_seguro>';

-- Permiso de conexión a la base de datos
GRANT CONNECT ON DATABASE gts_dev_db TO chatbot_ro;

-- Acceso al schema público
GRANT USAGE ON SCHEMA public TO chatbot_ro;

-- Acceso de solo lectura a todas las tablas existentes
GRANT SELECT ON ALL TABLES IN SCHEMA public TO chatbot_ro;

-- Acceso automático a tablas que se creen en el futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO chatbot_ro;

-- Revocar explícitamente cualquier permiso de escritura (defensa en profundidad)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON ALL TABLES IN SCHEMA public
  FROM chatbot_ro;
