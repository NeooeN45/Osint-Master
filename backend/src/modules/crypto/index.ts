// ============================================================================
// CRYPTO & BLOCKCHAIN MODULES - 20+ modules pour investigation crypto
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { tryHttp } from "../utils";

// ---- 1. Bitcoin Address Lookup ----
export const bitcoinAddressModule: OSINTModule = {
  id: "bitcoin_address",
  name: "Bitcoin Address Analysis",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "bitcoin_address", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // Check if valid BTC address
    const isValid = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(address);
    
    if (isValid) {
      // Blockchain.info API
      const data = await tryHttp(`https://blockchain.info/rawaddr/${address}`, { timeout: 10000 });
      
      if (data) {
        entities.push({
          id: makeEntityId(), type: "btc_address_info", value: address,
          source: "bitcoin_address", confidence: 95,
          metadata: { 
            final_balance: data.final_balance,
            total_received: data.total_received,
            total_sent: data.total_sent,
            n_tx: data.n_tx,
            transactions: (data.txs || []).slice(0, 5).map((tx: any) => ({
              hash: tx.hash,
              time: tx.time,
              value: tx.result
            }))
          },
          verified: true, depth: 0
        });
      }
      
      // Explorer links
      const explorers = [
        `https://www.blockchain.com/explorer/addresses/btc/${address}`,
        `https://blockchair.com/bitcoin/address/${address}`,
        `https://btc.com/${address}`,
        `https://explorer.btc.com/btc/address/${address}`,
      ];
      
      entities.push({
        id: makeEntityId(), type: "blockchain_explorer", value: explorers[0],
        source: "bitcoin_explorers", confidence: 90,
        metadata: { address, all_explorers: explorers },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "bitcoin_address", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length, valid: isValid }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 2. Ethereum Address Lookup ----
export const ethereumAddressModule: OSINTModule = {
  id: "ethereum_address",
  name: "Ethereum Address Analysis",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "ethereum_address", target } });
    
    const entities: any[] = [];
    const address = target.trim().toLowerCase();
    
    // Check if valid ETH address
    const isValid = /^0x[a-f0-9]{40}$/.test(address);
    
    if (isValid) {
      // Etherscan API (requires API key for full data, but some endpoints work)
      const explorers = [
        `https://etherscan.io/address/${address}`,
        `https://ethplorer.io/address/${address}`,
        `https://blockchair.com/ethereum/address/${address}`,
        `https://debank.com/profile/${address}`,
        `https://zapper.fi/account/${address}`,
      ];
      
      entities.push({
        id: makeEntityId(), type: "eth_address_info", value: address,
        source: "ethereum_address", confidence: 95,
        metadata: { 
          explorers,
          debank_url: `https://debank.com/profile/${address}`,
          zapper_url: `https://zapper.fi/account/${address}`,
        },
        verified: true, depth: 0
      });
      
      // Check for ENS
      const ensData = await tryHttp(`https://api.ensideas.com/ens/resolve/${address}`, { timeout: 5000 });
      if (ensData?.name) {
        entities.push({
          id: makeEntityId(), type: "ens_name", value: ensData.name,
          source: "ethereum_ens", confidence: 90,
          metadata: { address, ens: ensData.name },
          verified: true, depth: 0
        });
      }
    }
    
    emit({ type: "tool_done", data: { tool: "ethereum_address", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length, valid: isValid }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 3. Monero Address Check ----
export const moneroAddressModule: OSINTModule = {
  id: "monero_address",
  name: "Monero Address Validator",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "monero_address", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // XMR address validation (starts with 4 or 8)
    const isValid = /^[48][a-zA-Z0-9]{94}$/.test(address);
    
    if (isValid) {
      entities.push({
        id: makeEntityId(), type: "xmr_address_info", value: address,
        source: "monero_address", confidence: 95,
        metadata: { 
          valid: true,
          note: "Monero is private - transaction details not publicly visible",
          explorer: `https://xmrchain.net/search?value=${address}`
        },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "monero_address", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length, valid: isValid }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 4. Litecoin Address Lookup ----
export const litecoinAddressModule: OSINTModule = {
  id: "litecoin_address",
  name: "Litecoin Address Analysis",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "litecoin_address", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // LTC address validation
    const isValid = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/.test(address);
    
    if (isValid) {
      entities.push({
        id: makeEntityId(), type: "ltc_address_info", value: address,
        source: "litecoin_address", confidence: 95,
        metadata: { 
          valid: true,
          explorer: `https://blockchair.com/litecoin/address/${address}`,
          sochain: `https://sochain.com/address/LTC/${address}`
        },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "litecoin_address", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length, valid: isValid }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 5. Dogecoin Address Lookup ----
export const dogecoinAddressModule: OSINTModule = {
  id: "dogecoin_address",
  name: "Dogecoin Address Analysis",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "dogecoin_address", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // DOGE address validation (starts with D)
    const isValid = /^D[A-Za-z0-9]{33,34}$/.test(address);
    
    if (isValid) {
      entities.push({
        id: makeEntityId(), type: "doge_address_info", value: address,
        source: "dogecoin_address", confidence: 95,
        metadata: { 
          valid: true,
          explorer: `https://blockchair.com/dogecoin/address/${address}`,
          dogechain: `https://dogechain.info/address/${address}`
        },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "dogecoin_address", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length, valid: isValid }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 6. Multi-Coin Address Detector ----
export const multiCoinDetectorModule: OSINTModule = {
  id: "multicoin_detector",
  name: "Multi-Cryptocurrency Address Detector",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "multicoin_detector", target } });
    
    const address = target.trim();
    const entities: any[] = [];
    
    const patterns = [
      { coin: "Bitcoin", pattern: /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/, explorer: `https://blockchair.com/bitcoin/address/${address}` },
      { coin: "Ethereum", pattern: /^0x[a-f0-9]{40}$/i, explorer: `https://etherscan.io/address/${address}` },
      { coin: "Litecoin", pattern: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/, explorer: `https://blockchair.com/litecoin/address/${address}` },
      { coin: "Dogecoin", pattern: /^D[A-Za-z0-9]{33,34}$/, explorer: `https://blockchair.com/dogecoin/address/${address}` },
      { coin: "Bitcoin Cash", pattern: /^(bitcoincash:)?(q|p)[a-z0-9]{41}$/, explorer: `https://blockchair.com/bitcoin-cash/address/${address}` },
      { coin: "Dash", pattern: /^X[a-km-zA-HJ-NP-Z1-9]{33}$/, explorer: `https://blockchair.com/dash/address/${address}` },
      { coin: "Zcash", pattern: /^t[a-z0-9]{34}$|^zs[a-z0-9]{75}$/, explorer: `https://blockchair.com/zcash/address/${address}` },
      { coin: "Monero", pattern: /^[48][a-zA-Z0-9]{94}$/, explorer: `https://xmrchain.net/search?value=${address}` },
      { coin: "Ripple", pattern: /^r[a-zA-Z0-9]{24,34}$/, explorer: `https://blockchair.com/ripple/address/${address}` },
      { coin: "Cardano", pattern: /^addr[a-z0-9]{98}$|^addr1[a-z0-9]{98}$/, explorer: `https://blockchair.com/cardano/address/${address}` },
      { coin: "Polkadot", pattern: /^1[a-zA-Z0-9]{46,47}$/, explorer: `https://polkadot.subscan.io/account/${address}` },
      { coin: "Solana", pattern: /^[a-zA-Z0-9]{32,44}$/, explorer: `https://solscan.io/account/${address}` },
      { coin: "Tron", pattern: /^T[a-zA-Z0-9]{33}$/, explorer: `https://tronscan.org/#/address/${address}` },
    ];
    
    for (const { coin, pattern, explorer } of patterns) {
      if (pattern.test(address)) {
        entities.push({
          id: makeEntityId(), type: "crypto_address_detected", value: address,
          source: "multicoin_detector", confidence: 98,
          metadata: { coin, address, explorer },
          verified: true, depth: 0
        });
      }
    }
    
    emit({ type: "tool_done", data: { tool: "multicoin_detector", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length, detections: entities.map(e => e.metadata.coin) }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 7. Transaction Hash Lookup ----
export const transactionHashModule: OSINTModule = {
  id: "transaction_hash",
  name: "Blockchain Transaction Lookup",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "transaction_hash", target } });
    
    const entities: any[] = [];
    const hash = target.trim();
    
    // BTC transaction (64 hex chars)
    if (/^[a-f0-9]{64}$/i.test(hash)) {
      entities.push({
        id: makeEntityId(), type: "btc_transaction", value: hash,
        source: "transaction_hash", confidence: 90,
        metadata: { 
          type: "Bitcoin Transaction",
          explorer: `https://blockchair.com/bitcoin/transaction/${hash}`,
          blockchain_info: `https://www.blockchain.com/btc/tx/${hash}`
        },
        verified: true, depth: 0
      });
      
      // Also check ETH (same format)
      entities.push({
        id: makeEntityId(), type: "eth_transaction", value: hash,
        source: "transaction_hash", confidence: 80,
        metadata: { 
          type: "Ethereum Transaction (possible)",
          explorer: `https://etherscan.io/tx/0x${hash}`,
          note: "Same hash format used by Ethereum"
        },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "transaction_hash", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 8. Wallet Profiler ----
export const walletProfilerModule: OSINTModule = {
  id: "wallet_profiler",
  name: "Crypto Wallet Profiler",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "wallet_profiler", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // Portfolio trackers
    const profilers = [
      { name: "DeBank", url: `https://debank.com/profile/${address}`, chains: ["ETH", "BSC", "Polygon", "Arbitrum", "Optimism"] },
      { name: "Zapper", url: `https://zapper.fi/account/${address}`, chains: ["ETH", "Polygon", "BSC", "Fantom"] },
      { name: "Zerion", url: `https://app.zerion.io/${address}`, chains: ["ETH", "Polygon", "BSC", "Arbitrum"] },
      { name: "APY Vision", url: `https://apy.vision/shared/${address}`, chains: ["ETH", "Polygon"] },
      { name: "DexGuru", url: `https://dex.guru/address/${address}`, chains: ["ETH", "BSC", "Polygon"] },
    ];
    
    for (const profiler of profilers) {
      entities.push({
        id: makeEntityId(), type: "wallet_profiler", value: profiler.url,
        source: `wallet_profiler_${profiler.name.toLowerCase()}`, confidence: 70,
        metadata: { address, service: profiler.name, supported_chains: profiler.chains },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "wallet_profiler", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 9. NFT Profiler ----
export const nftProfilerModule: OSINTModule = {
  id: "nft_profiler",
  name: "NFT Holder Profiler",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "nft_profiler", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // NFT portfolio trackers
    const trackers = [
      { name: "OpenSea", url: `https://opensea.io/${address}` },
      { name: "Blur", url: `https://blur.io/${address}` },
      { name: "Gem", url: `https://www.gem.xyz/profile/${address}` },
      { name: "NFTScan", url: `https://www.nftscan.com/${address}` },
      { name: "Etherscan NFT", url: `https://etherscan.io/tokenholdings?a=${address}` },
    ];
    
    for (const tracker of trackers) {
      entities.push({
        id: makeEntityId(), type: "nft_tracker", value: tracker.url,
        source: `nft_${tracker.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 75,
        metadata: { address, service: tracker.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "nft_profiler", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 10. Exchange Deposit Check ----
export const exchangeDepositModule: OSINTModule = {
  id: "exchange_deposit",
  name: "Exchange Deposit Address Checker",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "exchange_deposit", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // Known exchange patterns (simplified)
    const exchangePatterns = [
      { name: "Binance", patterns: [/^1/, /^3/], tags: ["bnb", "binance"] },
      { name: "Coinbase", patterns: [], tags: ["coinbase"] },
      { name: "Kraken", patterns: [], tags: ["kraken"] },
      { name: "Bitfinex", patterns: [], tags: ["bitfinex"] },
    ];
    
    // Check via Chainalysis or similar
    entities.push({
      id: makeEntityId(), type: "exchange_analysis", value: "https://www.chainalysis.com/",
      source: "exchange_deposit", confidence: 40,
      metadata: { 
        address,
        note: "Manual analysis required to identify exchange",
        tools: [
          "https://www.chainalysis.com/",
          "https://ciphertrace.com/",
          "https://www.elliptic.co/"
        ]
      },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "exchange_deposit", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 11. Crypto Scam Check ----
export const cryptoScamModule: OSINTModule = {
  id: "crypto_scam_check",
  name: "Crypto Scam/Blacklist Check",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "crypto_scam_check", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // Scam databases
    const checks = [
      { name: "Chainabuse", url: `https://www.chainabuse.com/search?query=${address}` },
      { name: "Scam Alert", url: `https://scam-alert.io/search?keyword=${address}` },
      { name: "Etherscan Label", url: `https://etherscan.io/address/${address}` },
      { name: "Bitcoin Abuse", url: `https://www.bitcoinabuse.com/reports/${address}` },
      { name: "Chainalysis Sanctions", url: `https://www.chainalysis.com/free-sanctions-screening-tools/` },
    ];
    
    for (const check of checks) {
      entities.push({
        id: makeEntityId(), type: "scam_check", value: check.url,
        source: `scam_${check.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 70,
        metadata: { address, service: check.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "crypto_scam_check", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 12. Smart Contract Analysis ----
export const smartContractModule: OSINTModule = {
  id: "smart_contract_analysis",
  name: "Smart Contract Analyzer",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "smart_contract_analysis", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // Check if it's a contract
    if (/^0x[a-f0-9]{40}$/i.test(address)) {
      const analyzers = [
        { name: "Etherscan", url: `https://etherscan.io/address/${address}#code` },
        { name: "OpenZeppelin", url: `https:// Defender.openzeppelin.com/` },
        { name: "CertiK", url: `https://www.certik.com/resources/coding` },
        { name: "Slither", url: `https://github.com/crytic/slither` },
        { name: "MythX", url: `https://mythx.io/` },
      ];
      
      for (const analyzer of analyzers) {
        entities.push({
          id: makeEntityId(), type: "contract_analyzer", value: analyzer.url,
          source: `contract_${analyzer.name.toLowerCase()}`, confidence: 65,
          metadata: { address, service: analyzer.name },
          verified: false, depth: 0
        });
      }
    }
    
    emit({ type: "tool_done", data: { tool: "smart_contract_analysis", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 13. ENS/BNS Name Resolver ----
export const ensResolverModule: OSINTModule = {
  id: "ens_resolver",
  name: "ENS/BNS Domain Resolver",
  category: "crypto",
  targetTypes: ["domain"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "ens_resolver", target } });
    
    const entities: any[] = [];
    const domain = target.trim();
    
    if (domain.endsWith(".eth") || domain.endsWith(".xyz") || domain.endsWith(".crypto")) {
      // ENS lookup
      const resolvers = [
        { name: "ENS App", url: `https://app.ens.domains/${domain}` },
        { name: "Etherscan ENS", url: `https://etherscan.io/enslookup-search?search=${domain}` },
        { name: "ENS Ideas", url: `https://ensideas.com/${domain}` },
      ];
      
      for (const resolver of resolvers) {
        entities.push({
          id: makeEntityId(), type: "ens_resolver", value: resolver.url,
          source: `ens_${resolver.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 85,
          metadata: { domain, service: resolver.name },
          verified: false, depth: 0
        });
      }
    }
    
    emit({ type: "tool_done", data: { tool: "ens_resolver", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 14. DeFi Protocol Analyzer ----
export const defiAnalyzerModule: OSINTModule = {
  id: "defi_analyzer",
  name: "DeFi Protocol Interaction Analyzer",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "defi_analyzer", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    if (/^0x[a-f0-9]{40}$/i.test(address)) {
      const defiTrackers = [
        { name: "DeBank", url: `https://debank.com/profile/${address}` },
        { name: "Zapper", url: `https://zapper.fi/account/${address}` },
        { name: "APY Vision", url: `https://apy.vision/shared/${address}` },
        { name: "DeFiSaver", url: `https://app.defisaver.com/accounts/${address}` },
        { name: "Instadapp", url: `https://instadapp.io/${address}` },
      ];
      
      for (const tracker of defiTrackers) {
        entities.push({
          id: makeEntityId(), type: "defi_tracker", value: tracker.url,
          source: `defi_${tracker.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 75,
          metadata: { address, service: tracker.name },
          verified: false, depth: 0
        });
      }
    }
    
    emit({ type: "tool_done", data: { tool: "defi_analyzer", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 15. Bridge/Transfer Tracker ----
export const bridgeTrackerModule: OSINTModule = {
  id: "bridge_tracker",
  name: "Cross-Chain Bridge Transfer Tracker",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "bridge_tracker", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    const bridges = [
      { name: "LayerZero", url: `https://layerzeroscan.com/address/${address}` },
      { name: "Axelar", url: `https://axelarscan.io/account/${address}` },
      { name: "Wormhole", url: `https://wormholescan.io/#/txs?address=${address}` },
      { name: "Hop", url: `https://explorer.hop.exchange/?addr=${address}` },
      { name: "Across", url: `https://across.to/transactions?address=${address}` },
    ];
    
    for (const bridge of bridges) {
      entities.push({
        id: makeEntityId(), type: "bridge_tracker", value: bridge.url,
        source: `bridge_${bridge.name.toLowerCase()}`, confidence: 60,
        metadata: { address, bridge: bridge.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "bridge_tracker", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 16. Bitcoin Lightning Lookup ----
export const lightningModule: OSINTModule = {
  id: "lightning_lookup",
  name: "Bitcoin Lightning Network Lookup",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "lightning_lookup", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // Lightning invoice or node pubkey
    if (address.startsWith("lnbc") || address.startsWith("lnurl") || /^[a-f0-9]{66}$/i.test(address)) {
      entities.push({
        id: makeEntityId(), type: "lightning_info", value: address,
        source: "lightning_lookup", confidence: 85,
        metadata: { 
          type: address.startsWith("lnbc") ? "Invoice" : address.startsWith("lnurl") ? "LNURL" : "Node Pubkey",
          explorer: `https://1ml.com/node/${address}`,
          amboss: `https://amboss.space/node/${address}`,
          mempool: `https://mempool.space/lightning/node/${address}`
        },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "lightning_lookup", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 17. Tornado Cash Check ----
export const tornadoCashModule: OSINTModule = {
  id: "tornado_cash_check",
  name: "Tornado Cash / Mixer Detector",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "tornado_cash_check", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // Known Tornado Cash contracts
    const tornadoContracts = [
      "0x722122dF12D4e14e13Ac3b6895Cb4022723555b8", // 0.1 ETH
      "0xd90e2f925DA726b58Cdd842BB4fA76e1d3D87c5A", // 1 ETH  
      "0xD4B88Df4d29F5CedD685fcf25fCD9B11D5f9E1F8", // 10 ETH
      "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBd89", // 100 ETH
    ];
    
    // Check if address interacted with mixers
    if (/^0x[a-f0-9]{40}$/i.test(address)) {
      entities.push({
        id: makeEntityId(), type: "mixer_check", value: address,
        source: "tornado_cash_check", confidence: 60,
        metadata: { 
          address,
          note: "Check for mixer interactions",
          tools: [
            "https://etherscan.io/address/" + address,
            "https://app.breadcrumbs.io/",
            "https://chainalysis.com/"
          ],
          tornado_contracts: tornadoContracts
        },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "tornado_cash_check", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 18. Airdrop Hunter Check ----
export const airdropHunterModule: OSINTModule = {
  id: "airdrop_hunter_check",
  name: "Airdrop Hunter/Sybil Detector",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "airdrop_hunter_check", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    if (/^0x[a-f0-9]{40}$/i.test(address)) {
      entities.push({
        id: makeEntityId(), type: "airdrop_analysis", value: address,
        source: "airdrop_hunter_check", confidence: 50,
        metadata: { 
          address,
          note: "Check for airdrop farming behavior",
          tools: [
            `https://debank.com/profile/${address}`,
            "https://www.chainalysis.com/",
            "https://dune.com/"
          ]
        },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "airdrop_hunter_check", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 19. Token Approval Checker ----
export const tokenApprovalModule: OSINTModule = {
  id: "token_approval_check",
  name: "ERC20 Token Approval Checker",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "token_approval_check", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    if (/^0x[a-f0-9]{40}$/i.test(address)) {
      const checkers = [
        { name: "Revoke.cash", url: `https://revoke.cash/address/${address}` },
        { name: "Approved.zone", url: `https://approved.zone/${address}` },
        { name: "DeBank Approval", url: `https://debank.com/profile/${address}` },
        { name: "Etherscan Token Approvals", url: `https://etherscan.io/tokenapprovalchecker?search=${address}` },
      ];
      
      for (const checker of checkers) {
        entities.push({
          id: makeEntityId(), type: "approval_checker", value: checker.url,
          source: `approval_${checker.name.toLowerCase().replace(/[.\s]/g, "_")}`, confidence: 80,
          metadata: { address, service: checker.name },
          verified: false, depth: 0
        });
      }
    }
    
    emit({ type: "tool_done", data: { tool: "token_approval_check", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 20. Mining Pool Payout ----
export const miningPayoutModule: OSINTModule = {
  id: "mining_payout_check",
  name: "Mining Pool Payout Address",
  category: "crypto",
  targetTypes: ["crypto_address"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "mining_payout_check", target } });
    
    const entities: any[] = [];
    const address = target.trim();
    
    // Check mining pool associations
    const pools = [
      { name: "F2Pool", url: "https://www.f2pool.com/" },
      { name: "Poolin", url: "https://www.poolin.com/" },
      { name: "AntPool", url: "https://www.antpool.com/" },
      { name: "ViaBTC", url: "https://www.viabtc.com/" },
      { name: "BTC.com", url: "https://pool.btc.com/" },
    ];
    
    entities.push({
      id: makeEntityId(), type: "mining_check", value: address,
      source: "mining_payout_check", confidence: 40,
      metadata: { 
        address,
        note: "Check if address is a mining pool payout",
        known_pools: pools,
        tools: [
          "https://btc.com/stats/pool",
          "https://miningpoolstats.stream/"
        ]
      },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "mining_payout_check", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// Export all crypto modules
export const cryptoModules = [
  bitcoinAddressModule,
  ethereumAddressModule,
  moneroAddressModule,
  litecoinAddressModule,
  dogecoinAddressModule,
  multiCoinDetectorModule,
  transactionHashModule,
  walletProfilerModule,
  nftProfilerModule,
  exchangeDepositModule,
  cryptoScamModule,
  smartContractModule,
  ensResolverModule,
  defiAnalyzerModule,
  bridgeTrackerModule,
  lightningModule,
  tornadoCashModule,
  airdropHunterModule,
  tokenApprovalModule,
  miningPayoutModule,
];
