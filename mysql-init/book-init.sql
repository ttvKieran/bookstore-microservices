-- Grant all privileges to book_user from any host
CREATE USER IF NOT EXISTS 'book_user'@'%' IDENTIFIED BY 'book_pass';
GRANT ALL PRIVILEGES ON book_db.* TO 'book_user'@'%';
FLUSH PRIVILEGES;
