
'use server';

const ALCHEMY_KEY = process.env.ALCHEMY_KEY_PROTOCOL ?? '';
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? '';

export async function getRpcUrl() {
  return `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`;
};

export async function getPrivateKey() {
  return PRIVATE_KEY;
};

export async function getNetworkInfo() {
  const rpcUrl = await getRpcUrl();
  return {
    chainId: 84532,
    providerUrl: `${rpcUrl}`,
    explorerLink: 'https://sepolia.basescan.org',
    // Core addresses needed for Spark platform
    admin: '0x96f67a852f8d3bc05464c4f91f97aace060e247a',
    researchFundingWallet: '0x96f67a852f8d3bc05464c4f91f97aace060e247a',
    usdc: '0x08D39BBFc0F63668d539EA8BF469dfdeBAe58246',
    sci: '0xff88CC162A919bdd3F8552D331544629A6BEC1BE',
    po: '0x2bd09Da36560A71D2102c17eBE5bF4f7E211745A',
    sciManager: '0x26E10Ca7Bbe1f25333F95Dc3c498F6f405F8F6B0',
    
    // Spark-related governance contracts
    governorResearch: '0x4671d4ADD3B496B6A1fc722aFF975Df5b2e00BFc',
    governorExecutor: '0xED3f4cE4f426DFb5C33dD8e68c08c2002BB4Fafb',
    governorGuard: '0x1246C3780f31105816501F0b77C119FB41E804A8',
    transactionResearch: '0x2489F26c6da646C20bD0b3e245967aB6429261B9',
    actionFactoryResearch: '0x7E2C25401eeE24D2b4C22e5289Af0dDD0Af5298E',
    
    // Spark core contracts
    attestationVault: '0x0660C4c04FC99AC60E83013d185268216a3C3fc5',
    sparkIdeaRegistry: '0x6ecBa4cDeA84B8129318B1021Dd8e5Dd5dba3355',
    sparkBridge: '0x3405D083b2D9444148FD20200E887F921CfbC235',
    sparkIpNft: '0x44F86F95e1f3a91FcEd982CbDfcC7A9de971c8F9',
    mintIpNft: '0x1C43198E4f1705430b54a99fB484Fc02C98e1Ff0',
    fundAndMintIpNft: '0xE87E8e86aC2b9B709A1474cAF4BbCd70565960C7',
    copyleftIpPool: '0x77c2530E0be8c18a186c4e00986bDf73baF4426E',
  };
};
