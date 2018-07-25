
module.exports = {
  testnet: {
    deployment:{
      accounts: [
        {
          mnemonic: process.env.MNEMONIC
        }
      ],
      host: process.env.INFURA,
      port: false,
      protocol: 'https',
      type: "rpc"
    },
    contracts: {
      SafeMathLib: {
        args: [
        ]
      },      
      ERC20Token: { 
        args: [
          1000000,
          "STK Token", 
          18, 
          "STK"
        ]
      }, 
      STKLibrary: {
        args: [
        ],
      },
      STKChannel: {
        "deploy": false
      }      
    }
  }
};