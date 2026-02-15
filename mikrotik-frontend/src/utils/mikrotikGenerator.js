export const generateMikrotikScript = (config = {}) => {
  const { 
    selectedModel,
    wanList = [], 
    networks = [], 
    portConfig = {}, 
    pbrConfig = { enabled: false, mappings: {} }, 
    dnsConfig = { servers: ['8.8.8.8', '1.1.1.1'], allowRemoteRequests: true }, 
    circuitId = 'MikroTik-Router', 
    token = '', 
    apiHost = '10.0.0.100' 
  } = config;

  const checkIPs = ['1.1.1.1', '8.8.8.8', '9.9.9.9', '149.112.112.112', '208.67.222.222'];
  const activeWans = wanList.slice(0, 5);
  const bridgeName = "bridge-trunk";

  // คัดกรอง LAN Ports
  const wanInterfaces = wanList.map(w => w.interface);
  const lanPorts = selectedModel?.ports.filter(p => !wanInterfaces.includes(p.name)) || [];

  try {
    let script = `################################################\n`;
    script += `# Generated Date: ${new Date().toLocaleString()}\n`;
    script += `# Identity: ${circuitId}\n`;
    script += `################################################\n\n`;

    // --- 1. SYSTEM SETTINGS (Identity, User, Clock, Services) ---
    script += `/system identity set name="${circuitId}"\n`;
    
    // System Clock & NTP
    script += `/system clock set time-zone-name=Asia/Bangkok\n`;
    script += `/system ntp client set enabled=yes servers=time.google.com,time1.google.com\n`;

    // User Management
    script += `/user add name=ntadmin group=full password="lkfgxifde" comment="Created by Wizard"\n`;
    script += `/user remove [find name=admin]\n`;

    // Disable Services (Security)
    script += `/ip service set telnet disabled=yes\n`;
    script += `/ip service set ftp disabled=yes\n`;
    script += `/ip service set www disabled=yes\n`;
    script += `/ip service set ssh disabled=yes\n`;
    script += `/ip service set api disabled=yes\n`;
    script += `/ip service set api-ssl disabled=yes\n`;
    script += `/ip service set winbox disabled=no\n`; // Keep Winbox Open

    script += `\n`;

    // --- 2. BRIDGE & PORTS SETUP ---
    script += `/interface bridge add name=${bridgeName} vlan-filtering=yes\n`;

    if (lanPorts.length > 0) {
      lanPorts.forEach(port => {
        const conf = portConfig[port.name] || { mode: 'access', pvid: 10, nativeVlan: 1, allowed: [] };
        
        if (conf.mode === 'access') {
          script += `/interface bridge port add bridge=${bridgeName} interface=${port.name} pvid=${conf.pvid} comment="Access VLAN ${conf.pvid}"\n`;
        } 
        else if (conf.mode === 'trunk') {
          const nativeVlan = conf.nativeVlan || 1;
          script += `/interface bridge port add bridge=${bridgeName} interface=${port.name} pvid=${nativeVlan} comment="Trunk Native ${nativeVlan}"\n`;
        }
      });
    }

    // สร้าง Interface VLAN
    networks.forEach(net => {
      script += `/interface vlan add name=${net.name} vlan-id=${net.vlanId} interface=${bridgeName} comment="${net.name}"\n`;
    });

    // Bridge VLAN Table
    const vlanMap = {}; 
    networks.forEach(net => { vlanMap[net.vlanId] = [bridgeName]; });

    lanPorts.forEach(port => {
      const conf = portConfig[port.name] || { mode: 'access', pvid: 10, nativeVlan: 1, allowed: [] };
      if (conf.mode === 'trunk' && conf.allowed) {
        conf.allowed.forEach(vlanId => {
          if (vlanId !== (conf.nativeVlan || 1)) {
             if (!vlanMap[vlanId]) vlanMap[vlanId] = [bridgeName];
             vlanMap[vlanId].push(port.name);
          }
        });
      }
    });

    Object.entries(vlanMap).forEach(([vlanId, ports]) => {
      script += `/interface bridge vlan add bridge=${bridgeName} vlan-ids=${vlanId} tagged=${ports.join(',')}\n`;
    });

    // --- 3. WAN INTERFACES & ROUTING ---
    script += `\n/interface list add name=WAN\n`;
    script += `/interface list add name=LAN\n`;
    
    // Neighbor Discovery Settings (Disable on WAN)
    script += `/ip neighbor discovery-settings set discover-interface-list=LAN\n`;

    script += `\n/ip route\n`;

    activeWans.forEach((wan, idx) => {
      const wanIdx = idx + 1;
      const checkIp = checkIPs[idx];
      const table = `to-wan${wanIdx}`;
      script += `/routing table add name=${table} fib\n`;

      const wanName = wan.type === 'pppoe' ? `pppoe-out${wanIdx}` : wan.interface;
      
      if (wan.type === 'pppoe') {
        script += `/interface pppoe-client add name=${wanName} interface=${wan.interface} user="${wan.username}" password="${wan.password}" add-default-route=no disabled=no\n`;
        script += `/interface list member add interface=${wanName} list=WAN\n`;
        script += `# WAN ${wanIdx} PPPoE Recursive Routing\n`;
        script += `add dst-address=${checkIp}/32 gateway=${wanName} scope=10 comment="Check Host WAN ${wanIdx}"\n`;
        script += `add check-gateway=ping distance=1 dst-address=0.0.0.0/0 gateway=${checkIp} routing-table=${table} target-scope=11\n`;
        script += `add check-gateway=ping distance=${wanIdx} dst-address=0.0.0.0/0 gateway=${checkIp} comment="Main Failover WAN ${wanIdx}"\n`;
      } 
      else if (wan.type === 'static') {
        script += `/ip address add address=${wan.ipAddress} interface=${wan.interface}\n`;
        script += `/interface list member add interface=${wan.interface} list=WAN\n`;
        script += `# WAN ${wanIdx} Static Recursive Routing\n`;
        script += `add dst-address=${checkIp}/32 gateway=${wan.gateway} scope=10 comment="Check Host WAN ${wanIdx}"\n`;
        script += `add check-gateway=ping distance=1 dst-address=0.0.0.0/0 gateway=${checkIp} routing-table=${table} target-scope=11\n`;
        script += `add check-gateway=ping distance=${wanIdx} dst-address=0.0.0.0/0 gateway=${checkIp} comment="Main Failover WAN ${wanIdx}"\n`;
      } 
      // DHCP Config Skipped
    });

    // Backup Routes
    activeWans.forEach((wan, idx) => {
      if (wan.type === 'dhcp') return;

      const table = `to-wan${idx + 1}`;
      activeWans.forEach((bWan, bIdx) => {
        if (idx !== bIdx && bWan.type !== 'dhcp') {
           const bWanIdx = bIdx + 1;
           const bGw = bWan.type === 'pppoe' ? `pppoe-out${bWanIdx}` : bWan.gateway;
           script += `add distance=${bWanIdx + 2} dst-address=0.0.0.0/0 gateway=${bGw} routing-table=${table} comment="Backup Via WAN ${bWanIdx}"\n`;
        }
      });
    });

    // --- 4. IP ADDRESS & SERVICES (LAN) ---
    script += `\n/ip pool\n`;
    networks.forEach(net => {
      const [ipAddr, mask] = net.ip.split('/');
      const ipParts = ipAddr.split('.');
      const prefix = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
      script += `/ip address add address=${net.ip} interface=${net.name} comment="${net.name}"\n`;

      if (net.dhcp || net.hotspot) {
        const poolName = `pool_${net.name}`;
        script += `add name=${poolName} ranges=${prefix}.10-${prefix}.250\n`;
        
        if (net.hotspot) {
          script += `\n# --- HOTSPOT SETUP FOR ${net.name} ---\n`;
          script += `/ip hotspot profile add name=hsprof_${net.name} dns-name="" hotspot-address=${ipAddr} html-directory=hotspot login-by=mac,cookie,http-chap,http-pap\n`;
          script += `/ip hotspot add name=hs_${net.name} interface=${net.name} address-pool=${poolName} profile=hsprof_${net.name} disabled=no\n`;
          
          script += `/ip dhcp-server add name=dhcp_${net.name} interface=${net.name} address-pool=${poolName} disabled=no lease-time=1h\n`;
          script += `/ip dhcp-server network add address=${prefix}.0/${mask} gateway=${ipAddr} dns-server=${ipAddr} comment="Hotspot Network ${net.name}"\n`;
        } 
        else {
          script += `/ip dhcp-server add name=dhcp_${net.name} interface=${net.name} address-pool=${poolName} disabled=no lease-time=1d\n`;
          const dnsServer = dnsConfig.allowRemoteRequests ? ipAddr : dnsConfig.servers.join(',');
          script += `/ip dhcp-server network add address=${prefix}.0/${mask} gateway=${ipAddr} dns-server=${dnsServer} comment="${net.name}"\n`;
        }
      }
    });

    // --- 5. DNS & FIREWALL ---
    script += `\n/ip dns set allow-remote-requests=${dnsConfig.allowRemoteRequests ? 'yes' : 'no'} servers=${dnsConfig.servers.join(',')}\n`;
    
    script += `\n/ip firewall address-list\n`;
    // ✅ ตั้งค่า Default Management IP ตามที่ระบุ
    script += `add address=10.234.56.0/24 list=management comment="Default Management"\n`;
    
    networks.forEach(net => {
      if (net.ip) {
        const [ipAddr, mask] = net.ip.split('/');
        const ipParts = ipAddr.split('.');
        const netAddr = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/${mask}`;
        script += `add address=${netAddr} list=Local_Networks comment="${net.name}"\n`;
      }
    });
    
    script += `\n/ip firewall filter\n`;
    script += `add action=drop chain=input comment="Drop Invalid" connection-state=invalid\n`;
    script += `add action=accept chain=input comment="Established" connection-state=established,related\n`;
    script += `add action=accept chain=input comment="Winbox" dst-port=8291 protocol=tcp src-address-list=management\n`;
    script += `add action=accept chain=input comment="ICMP" protocol=icmp\n`;
    script += `add action=accept chain=input comment="DNS UDP" dst-port=53 protocol=udp src-address-list=Local_Networks\n`;
    script += `add action=accept chain=input comment="DNS TCP" dst-port=53 protocol=tcp src-address-list=Local_Networks\n`;
    script += `add action=drop chain=input comment="Drop All Else"\n`;
    
    // --- 6. MANGLE (PBR) ---
    script += `\n/ip firewall mangle\n`;
    script += `add action=accept chain=prerouting comment="Bypass Inter-VLAN" dst-address-list=Local_Networks src-address-list=Local_Networks\n`;

    if (pbrConfig.enabled) {
      networks.forEach(net => {
        const selectedWanId = pbrConfig.mappings[net.id] || activeWans[0]?.id;
        const wanIndex = activeWans.findIndex(w => String(w.id) === String(selectedWanId)) + 1;
        
        if (wanIndex > 0) {
          script += `add action=mark-routing chain=prerouting comment="PBR ${net.name} to WAN ${wanIndex}" dst-address-type=!local in-interface=${net.name} new-routing-mark=to-wan${wanIndex} passthrough=yes\n`;
        }
      });
    }

    // --- 7. NAT & HEARTBEAT ---
    script += `\n/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade\n`;
    
    if (networks.some(n => n.hotspot)) {
        script += `/ip firewall nat add chain=srcnat action=masquerade src-address-list=Local_Networks comment="Masquerade Local Networks"\n`;
    }

    const apiToken = token || "PUT_YOUR_TOKEN_HERE";
    script += `\n/system scheduler add name="CloudHeartbeat" interval=1m on-event={ /tool fetch url="http://${apiHost}:3000/api/devices/heartbeat?token=${apiToken}" keep-result=no }\n`;

    return script;

  } catch (err) {
    console.error("Generator Error:", err);
    return `# ERROR GENERATING SCRIPT: ${err.message}`;
  }
};