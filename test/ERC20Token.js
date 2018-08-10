/*global contract, config, it, assert, web3*/
const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const MultiLibrary = require('Embark/contracts/MultiLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const port = 8545; 


contract("Testing ERC20 Token", function () {
    this.timeout(0);
    let allAccounts;
    const timeout = 10;
    const initialCreation = 1000000000; 

    config({
        deployment: {
            "host": "localhost",
            "port": port,
            "type": "rpc"
        }
    });

    before(function(done) {
        web3.eth.getAccounts(function (err, accounts) {
            if (err) {
                return done(err);
            }
            config({
                "deployment": {
                    "host": "localhost",
                    "port": port,
                    "type": "rpc",
                    "accounts": [
                        // {
                        //     "privateKeyFile": "test/helpers/privateKeys.js" // You can put more than one key, separated by , or ;
                        // },
                        // {
                        //     "mnemonic": "example exile argue silk regular smile grass bomb merge arm assist farm",
                        //     "addressIndex": "0", // Optional. The index to start getting the address
                        //     "numAddresses": "10", // Optional. The number of addresses to get
                        // }
                    ]},
                    contracts: {
                        "Token": {

                        },
                        "StandardToken": {

                        },
                        "ERC20Token": {
                            args: [initialCreation,'STK', 18, 'STK'],
                            "fromIndex":3
                        },
                        MultiLibrary: {
                            args: [
                                '$ERC20Token',
                                accounts[0],
                                accounts[2],
                                accounts[1],
                                timeout,
                                1,
                                0,
                                0
                            ],
                            "fromIndex":1
                        },
                        "MultiChannel": {
                            args: [
                                accounts[0],
                                accounts[2],
                                '$ERC20Token',
                                timeout
                            ],
                            "fromIndex":1
                        }
                    }
                }, done);
                allAccounts = accounts;
            });
        });

    it("STK Token is deployed ", function()
    {
        let ERC20TokenAddress = ERC20Token.options.address;
        assert.ok(ERC20TokenAddress.length > 0);
    });

    it("STK Token should have 1 billion tokens in initialized account after declaration", async()=> {
        const balance = await ERC20Token.methods.balanceOf(allAccounts[3]).call(); 
        assert.equal(balance.valueOf(), 1000000000, '1 billion was not in the first account');
    });
    
    it('STK Token should have symbol as Multi',async()=> {
        const symbol = await ERC20Token.symbol.call();
        assert.equal(symbol,'STK','Symbol is not STK');
    });  
    
    it('STK Token should have 18 decimal points', async() => { 
        const decimal = await ERC20Token.decimals.call(); 
        assert.equal(decimal, 18, "Decimal points is not 18"); 
    })
    
});