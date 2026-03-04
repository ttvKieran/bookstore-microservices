-- Grant all privileges to comment_user from any host
CREATE USER IF NOT EXISTS 'comment_user'@'%' IDENTIFIED BY 'comment_pass';
GRANT ALL PRIVILEGES ON comment_db.* TO 'comment_user'@'%';
FLUSH PRIVILEGES;
