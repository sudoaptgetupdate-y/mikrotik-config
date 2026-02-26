const Footer = () => {
  return (
    <footer className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs text-center pb-4">
      {/* เปลี่ยนชื่อเป็นหน่วยงานของคุณ */}
      <p className="font-semibold text-slate-500">
        © {new Date().getFullYear()} Engineer of NTPLC Nakhon Si Thammarat. All rights reserved.
      </p>
      <p className="mt-1">Network Management System | Designed for MikroTik RouterOS</p>
    </footer>
  );
};

export default Footer;