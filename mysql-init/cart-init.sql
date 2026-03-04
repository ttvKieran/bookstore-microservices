-- Grant all privileges to cart_user from any host
CREATE USER IF NOT EXISTS 'cart_user'@'%' IDENTIFIED BY 'cart_pass';
GRANT ALL PRIVILEGES ON cart_db.* TO 'cart_user'@'%';
FLUSH PRIVILEGES;
