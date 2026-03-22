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
    sideA = { name: 'Site-A', privateKey: '', publicKey: '', address: '10.0.10.1/30', lan: '192.168.1.0/24', endpoint: '' },
    sideB = { name: 'Site-B', privateKey: '', publicKey: '', address: '10.0.10.2/30', lan: '192.168.2.0/24', endpoint: '' },
    listenPort = 51820
  } = params;

  const scriptA = `
# --- Configuration for ${sideA.name} (Side A) ---
/interface wireguard
add listen-port=${listenPort} name=wg-s2s-${sideB.name} private-key="${sideA.privateKey}"

/ip address
add address=${sideA.address} interface=wg-s2s-${sideB.name}

/interface wireguard peers
add allowed-address=${sideB.address},${sideB.lan} endpoint-address=${sideB.endpoint} endpoint-port=${listenPort} interface=wg-s2s-${sideB.name} public-key="${sideB.publicKey}" persistent-keepalive=25s

/ip route
add dst-address=${sideB.lan} gateway=${sideB.address.split('/')[0]} comment="Route to ${sideB.name}"

# --- Firewall Rules (Placed at top) ---
/ip firewall filter
add action=accept chain=input dst-port=${listenPort} protocol=udp comment="Allow WireGuard S2S - ${sideB.name}" place-before=0
add action=accept chain=forward src-address=${sideB.lan} dst-address=${sideA.lan} comment="Allow Traffic from ${sideB.name}" place-before=0
`;

  const scriptB = `
# --- Configuration for ${sideB.name} (Side B) ---
/interface wireguard
add listen-port=${listenPort} name=wg-s2s-${sideA.name} private-key="${sideB.privateKey}"

/ip address
add address=${sideB.address} interface=wg-s2s-${sideA.name}

/interface wireguard peers
add allowed-address=${sideA.address},${sideA.lan} endpoint-address=${sideA.endpoint} endpoint-port=${listenPort} interface=wg-s2s-${sideA.name} public-key="${sideA.publicKey}" persistent-keepalive=25s

/ip route
add dst-address=${sideA.lan} gateway=${sideA.address.split('/')[0]} comment="Route to ${sideA.name}"

# --- Firewall Rules (Placed at top) ---
/ip firewall filter
add action=accept chain=input dst-port=${listenPort} protocol=udp comment="Allow WireGuard S2S - ${sideA.name}" place-before=0
add action=accept chain=forward src-address=${sideA.lan} dst-address=${sideB.lan} comment="Allow Traffic from ${sideA.name}" place-before=0
`;

  return { scriptA, scriptB };
};
