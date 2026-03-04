-- Grant all privileges to catalog_user from any host
CREATE USER IF NOT EXISTS 'catalog_user'@'%' IDENTIFIED BY 'catalog_pass';
GRANT ALL PRIVILEGES ON catalog_db.* TO 'catalog_user'@'%';
FLUSH PRIVILEGES;
