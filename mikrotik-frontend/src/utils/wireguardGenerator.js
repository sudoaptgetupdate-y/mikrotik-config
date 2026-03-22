import nacl from 'tweetnacl';

/**
 * Utility for generating MikroTik WireGuard configurations
 */

export const generateWireguardKey = () => {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  
  // Basic Curve25519 bit clamping (optional but makes it a valid private key)
  bytes[0] &= 248;
  bytes[31] &= 127;
  bytes[31] |= 64;

  return btoa(String.fromCharCode(...bytes));
};

export const generateWireguardKeyPair = () => {
    // Generate private key
    const privateKeyBytes = new Uint8Array(32);
    window.crypto.getRandomValues(privateKeyBytes);
    
    // WireGuard private key clamping
    privateKeyBytes[0] &= 248;
    privateKeyBytes[31] &= 127;
    privateKeyBytes[31] |= 64;

    // Generate public key from private key using curve25519
    const keyPair = nacl.box.keyPair.fromSecretKey(privateKeyBytes);
    const publicKeyBytes = keyPair.publicKey;

    // Convert to base64
    const privateKey = btoa(String.fromCharCode(...privateKeyBytes));
    const publicKey = btoa(String.fromCharCode(...publicKeyBytes));

    return { privateKey, publicKey };
};

export const generateC2SConfig = (params) => {
  const {
    interfaceName = 'wireguard-client',
    listenPort = 51820,
    serverPrivateKey = '',
    serverAddress = '10.0.0.1/24',
    clientName = 'client1',
    clientPublicKey = '',
    clientAddress = '10.0.0.2/32',
    endpoint = '', // Public IP or DDNS
  } = params;

  const serverScript = `
# --- WireGuard Server Config (Run on MikroTik) ---
/interface wireguard
add listen-port=${listenPort} name=${interfaceName} private-key="${serverPrivateKey}"

/ip address
add address=${serverAddress} interface=${interfaceName}

/interface wireguard peers
add allowed-address=${clientAddress} interface=${interfaceName} public-key="${clientPublicKey}" comment="${clientName}"

# --- Firewall Rules (Placed at top to bypass any drop rules) ---
/ip firewall filter
add action=accept chain=input dst-port=${listenPort} protocol=udp comment="Allow WireGuard VPN Incoming" place-before=0
add action=accept chain=forward src-address=${serverAddress} comment="Allow WireGuard Subnet Forwarding" place-before=0
add action=accept chain=input src-address=${serverAddress} comment="Allow WireGuard Subnet to Router" place-before=0
`;

  return { serverScript };
};

export const generateS2SConfig = (params) => {
  const {
    sideA = { name: 'Site-A', privateKey: '', publicKey: '', address: '10.0.10.1/30', lan: '', endpoint: '', autoRoute: true },
    sideB = { name: 'Site-B', privateKey: '', publicKey: '', address: '10.0.10.2/30', lan: '', endpoint: '', autoRoute: true },
    listenPort = 51820
  } = params;

  // 🟢 Helper to join addresses without trailing commas or spaces
  const getAllowedAddresses = (peer) => {
    const parts = [];
    if (peer.address && peer.address.trim()) parts.push(peer.address.trim());
    if (peer.lan && peer.lan.trim()) {
        peer.lan.split(',').forEach(s => {
            if (s.trim()) parts.push(s.trim());
        });
    }
    return parts.join(',');
  };

  // 🟢 Helper to generate routes for potentially multiple LAN subnets
  const generateRoutes = (targetLan, gatewayIp, targetName, enabled) => {
    if (!enabled || !targetLan || !targetLan.trim()) return "";
    return targetLan.split(',').map(s => {
        const subnet = s.trim();
        if (!subnet) return "";
        return `/ip route add dst-address=${subnet} gateway=${gatewayIp} comment="Route to ${targetName}"`;
    }).filter(Boolean).join('\n');
  };

  // 🟢 Helper to generate forward rules safely
  const generateForwardRules = (srcLan, dstLan, peerName) => {
    if (!srcLan || !srcLan.trim() || !dstLan || !dstLan.trim()) return "";
    return `add action=accept chain=forward src-address=${srcLan.trim()} dst-address=${dstLan.trim()} comment="Allow Traffic from ${peerName}" place-before=0`;
  };

  const scriptA = `
# --- Configuration for ${sideA.name} (Side A) ---
/interface wireguard
add listen-port=${listenPort} name=wg-s2s-${sideB.name} private-key="${sideA.privateKey}"

/ip address
add address=${sideA.address} interface=wg-s2s-${sideB.name}

/interface wireguard peers
add allowed-address=${getAllowedAddresses(sideB)} endpoint-address="${sideB.endpoint}" endpoint-port=${listenPort} interface=wg-s2s-${sideB.name} public-key="${sideB.publicKey}" persistent-keepalive=25s comment="Peer to ${sideB.name}"

${generateRoutes(sideB.lan, (sideB.address || "").split('/')[0], sideB.name, sideB.autoRoute)}

# --- Firewall Rules (Placed at top to bypass drop rules) ---
/ip firewall filter
add action=accept chain=input dst-port=${listenPort} protocol=udp comment="Allow WireGuard S2S - ${sideB.name}" place-before=0
${generateForwardRules(sideB.lan, sideA.lan, sideB.name)}
`;

  const scriptB = `
# --- Configuration for ${sideB.name} (Side B) ---
/interface wireguard
add listen-port=${listenPort} name=wg-to-${sideA.name} private-key="${sideB.privateKey}"

/ip address
add address=${sideB.address} interface=wg-to-${sideA.name}

/interface wireguard peers
add allowed-address=${getAllowedAddresses(sideA)} endpoint-address="${sideA.endpoint}" endpoint-port=${listenPort} interface=wg-to-${sideA.name} public-key="${sideA.publicKey}" persistent-keepalive=25s comment="Peer to ${sideA.name}"

${generateRoutes(sideA.lan, (sideA.address || "").split('/')[0], sideA.name, sideA.autoRoute)}

# --- Firewall Rules (Placed at top to bypass drop rules) ---
/ip firewall filter
add action=accept chain=input dst-port=${listenPort} protocol=udp comment="Allow WireGuard S2S - ${sideA.name}" place-before=0
${generateForwardRules(sideA.lan, sideB.lan, sideA.name)}
`;

  return { scriptA, scriptB };
};
