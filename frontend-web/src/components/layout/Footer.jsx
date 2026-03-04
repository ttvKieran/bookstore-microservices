import React from 'react';
import { Box, Container, Typography, Link, Grid, Divider } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'grey.900',
        color: 'white',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MenuBookIcon sx={{ mr: 1, fontSize: 32 }} />
              <Typography variant="h6" fontWeight={700}>
                BOOKSTORE
              </Typography>
            </Box>
            <Typography variant="body2" color="grey.400">
              Your trusted online bookstore for all kinds of books. From bestsellers
              to hidden gems, we have it all.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Link href="#" color="inherit">
                <FacebookIcon />
              </Link>
              <Link href="#" color="inherit">
                <TwitterIcon />
              </Link>
              <Link href="#" color="inherit">
                <InstagramIcon />
              </Link>
              <Link href="#" color="inherit">
                <LinkedInIcon />
              </Link>
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/" color="grey.400" underline="hover">
                Home
              </Link>
              <Link href="/books" color="grey.400" underline="hover">
                All Books
              </Link>
              <Link href="/categories" color="grey.400" underline="hover">
                Categories
              </Link>
              <Link href="/trending" color="grey.400" underline="hover">
                Trending
              </Link>
            </Box>
          </Grid>

          {/* Customer Service */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Customer Service
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/orders" color="grey.400" underline="hover">
                My Orders
              </Link>
              <Link href="/cart" color="grey.400" underline="hover">
                Shopping Cart
              </Link>
              <Link href="#" color="grey.400" underline="hover">
                Shipping Info
              </Link>
              <Link href="#" color="grey.400" underline="hover">
                Return Policy
              </Link>
            </Box>
          </Grid>

          {/* Contact */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Contact Us
            </Typography>
            <Typography variant="body2" color="grey.400" mb={1}>
              Email: support@bookstore.com
            </Typography>
            <Typography variant="body2" color="grey.400" mb={1}>
              Phone: +84 123 456 789
            </Typography>
            <Typography variant="body2" color="grey.400">
              Address: District 1, Ho Chi Minh City
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, bgcolor: 'grey.700' }} />

        {/* Copyright */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="grey.500">
            © {new Date().getFullYear()} BookStore Microservices. All rights reserved.
          </Typography>
          <Typography variant="body2" color="grey.600" mt={0.5}>
            Built with React + Material-UI | Powered by Polyglot Microservices Architecture
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
