const { ethers } = require('hardhat');
require('dotenv').config({ path: '.env' });
const { WHITELIST_CONTRACT_ADDRESS, METADATA_URL } = require('../constants');

const main = async () => {
  // Address of the whitelist contract previously deployed in whitelist-dapp
  const whitelistContract = WHITELIST_CONTRACT_ADDRESS;

  // URL from where we extract metadata for a Crypto Dev NFT
  const metadataURL = METADATA_URL;

  // ContractFactory in ethers.js is an abstraction used to deploy new smart contracts
  // cryptoDevsContract here is a factory for instances of our CryptoDevs contract
  const cryptoDevsContract = await ethers.getContractFactory('CryptoDevs');

  // contract deployment
  const deployedCryptoDevsContract = await cryptoDevsContract.deploy(
    metadataURL,
    whitelistContract
  );

  // print address of deployed contract
  console.log(
    'Crypto Devs Contract Address:',
    deployedCryptoDevsContract.address
  );
};

// call main function and catch errors if there are any
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
