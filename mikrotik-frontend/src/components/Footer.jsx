// src/components/Footer.jsx

const Footer = () => {
  return (
    <footer className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs text-center pb-4">
      <p>© {new Date().getFullYear()} Network Management System. All rights reserved.</p>
      <p className="mt-1">Designed for MikroTik RouterOS Configuration</p>
    </footer>
  );
};

export default Footer;