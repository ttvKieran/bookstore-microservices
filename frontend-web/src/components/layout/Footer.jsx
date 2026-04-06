import React from 'react';
import { BookOpen, Briefcase, Globe, Image, Send } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-950 text-slate-100">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-blue-400" />
            <p className="text-lg font-bold">BOOKSTORE</p>
          </div>
          <p className="text-sm text-slate-300">
            Your trusted online bookstore for bestsellers and hidden gems.
          </p>
          <div className="mt-4 flex items-center gap-2 text-slate-300">
            <a href="#" className="rounded-md p-2 hover:bg-slate-800"><Globe className="h-4 w-4" /></a>
            <a href="#" className="rounded-md p-2 hover:bg-slate-800"><Send className="h-4 w-4" /></a>
            <a href="#" className="rounded-md p-2 hover:bg-slate-800"><Image className="h-4 w-4" /></a>
            <a href="#" className="rounded-md p-2 hover:bg-slate-800"><Briefcase className="h-4 w-4" /></a>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Quick Links</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <a href="/" className="block hover:text-white">Home</a>
            <a href="/catalog" className="block hover:text-white">Catalog</a>
            <a href="/recommendations" className="block hover:text-white">Recommendations</a>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Customer Service</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <a href="/orders" className="block hover:text-white">My Orders</a>
            <a href="/cart" className="block hover:text-white">Shopping Cart</a>
            <p>Shipping Info</p>
            <p>Return Policy</p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Contact</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <p>support@bookstore.com</p>
            <p>+84 123 456 789</p>
            <p>District 1, Ho Chi Minh City</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} BookStore Microservices. Powered by React + Tailwind.
      </div>
    </footer>
  );
};

export default Footer;
