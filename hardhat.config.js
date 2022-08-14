require("@nomicfoundation/hardhat-toolbox");
const projectId = '3c07677484124b5ca360bad84fa878d7';
const fs = require('fs');
const keyData = fs.readFileSync('./p-key.txt',{
  encoding: 'utf8', flag:'r'
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork : 'hardhat',
  networks : {
    hardhat : {
      chainId : 1337 // config standard
    },
    ropsten : {
      url:`https://ropsten.infura.io/v3/${projectId}`,
      accounts:[keyData]
    }
  },
  solidity: {
    version : "0.8.9",
    settings : {
      optimizer: {
        enabled: true,
        runs : 200
      }
    }
  }
};
