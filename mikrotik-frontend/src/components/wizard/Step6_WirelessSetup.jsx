import React, { useEffect } from 'react';
import { Wifi, Shield, ShieldAlert, Key } from 'lucide-react';

const Step6_WirelessSetup = ({ selectedModel, wirelessConfig, setWirelessConfig }) => {
  // ดึงเฉพาะพอร์ตที่เป็น WLAN ออกมา
  const wlanPorts = selectedModel?.ports?.filter(p => p.type === 'WLAN') || [];

  // Initialize ค่าเริ่มต้นให้แต่ละ WLAN Port (ถ้ายังไม่มี)
  useEffect(() => {
    if (wlanPorts.length > 0) {
      const initialConfig = { ...wirelessConfig };
      let hasChanges = false;

      wlanPorts.forEach(port => {
        if (!initialConfig[port.name]) {
          initialConfig[port.name] = {
            ssid: `MikroTik_${port.name}`, // ชื่อเริ่มต้น
            security: 'wpa2-psk',        // ความปลอดภัยเริ่มต้น
            password: '',                // รหัสผ่านเริ่มต้น
            band: port.name.includes('5') ? '5ghz-a/n/ac/ax' : '2ghz-b/g/n/ax', // เดา Band จากชื่อ (ถ้ามี)
          };
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setWirelessConfig(initialConfig);
      }
    }
  }, [selectedModel]); // ทำงานเมื่อมีการเปลี่ยนรุ่นอุปกรณ์

  // ฟังก์ชันสำหรับอัปเดตค่าของแต่ละพอร์ต
  const handleUpdate = (portName, field, value) => {
    setWirelessConfig(prev => ({
      ...prev,
      [portName]: {
        ...prev[portName],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Wifi className="text-blue-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Wireless Setup</h2>
        <p className="text-slate-500 mt-2">
          Configure Wi-Fi networks for your {selectedModel?.name}. 
          This step is specifically for devices with built-in wireless capabilities.
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        {wlanPorts.length === 0 ? (
           <div className="col-span-full text-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
             <p className="text-slate-500">No wireless interfaces found on this device model.</p>
           </div>
        ) : (
          wlanPorts.map((port) => {
            const config = wirelessConfig[port.name] || {};
            const isNoPassword = config.security === 'none';

            return (
              <div key={port.name} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-colors">
                
                {/* Header ของแต่ละ Wi-Fi */}
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Wifi size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 uppercase tracking-wide">{port.name}</h3>
                      <p className="text-xs text-slate-500">Interface</p>
                    </div>
                  </div>
                  {/* Badge แจ้งเตือนเรื่องความปลอดภัย */}
                  {isNoPassword ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      <ShieldAlert size={12} /> Unsecured
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      <Shield size={12} /> Secured
                    </span>
                  )}
                </div>

                {/* Form ตั้งค่า */}
                <div className="p-5 space-y-4">
                  
                  {/* SSID */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Network Name (SSID)</label>
                    <input 
                      type="text" 
                      value={config.ssid || ''}
                      onChange={(e) => handleUpdate(port.name, 'ssid', e.target.value)}
                      placeholder="e.g. MyWiFi_Network"
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Security Type */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Security</label>
                      <select 
                        value={config.security || 'wpa2-psk'}
                        onChange={(e) => {
                           handleUpdate(port.name, 'security', e.target.value);
                           if(e.target.value === 'none') handleUpdate(port.name, 'password', ''); // เคลียร์รหัสถ้ายกเลิก
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition"
                      >
                        <option value="none">Open (No Password)</option>
                        <option value="wpa2-psk">WPA2 Personal</option>
                        <option value="wpa2-wpa3-psk">WPA2 / WPA3</option>
                      </select>
                    </div>

                    {/* Password */}
                    <div>
                      <label className={`block text-sm font-bold mb-1.5 ${isNoPassword ? 'text-slate-400' : 'text-slate-700'}`}>
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key size={16} className={isNoPassword ? "text-slate-300" : "text-slate-400"} />
                        </div>
                        <input 
                          type="text" 
                          value={config.password || ''}
                          onChange={(e) => handleUpdate(port.name, 'password', e.target.value)}
                          placeholder={isNoPassword ? "Not required" : "Min 8 chars"}
                          disabled={isNoPassword}
                          className={`w-full pl-9 p-2.5 border rounded-lg focus:ring-2 outline-none transition ${
                            isNoPassword 
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'border-slate-300 focus:ring-blue-500 bg-white text-slate-800'
                          }`}
                        />
                      </div>
                      {!isNoPassword && config.password && config.password.length < 8 && (
                        <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Step6_WirelessSetup;