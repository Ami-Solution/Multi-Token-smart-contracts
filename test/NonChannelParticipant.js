/*global contract, config, it, assert, web3*/
const STKChannel = require('Embark/contracts/STKChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const STKLibrary = require('Embark/contracts/STKLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const closingHelper = require('./helpers/channelClosingHelper');
const assertRevert = require('./helpers/assertRevert');
const port = 8545;


contract("Testing Non Channel Participants", function () {
    this.timeout(0);
    let allAccounts;
    const timeout = 10;
    const initialCreation = 1000000000;
    const signersPk = Buffer.from('f4ebc8adae40bfc741b0982c206061878bffed3ad1f34d67c94fa32c3d33eac8', 'hex');
    const nonParticipant = Buffer.from('130137aa9a7fbc7cadc98c079cda47a999ff41931d9feaab621855beceed71f7','hex');
    var nonce = 1;
    
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
                        "WETHToken": {
                            args:[initialCreation, "WETH", 18, "STK"],
                            "instanceOf": "ERC20Token",
                            "fromIndex":3
                        },
                        "ERC20Token": {
                            args: [initialCreation,'STK', 18, 'STK'],
                            "fromIndex":3
                        },
                        STKLibrary: {
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
                        "STKChannel": {
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
        
        it("Cannot close a channel with valid signature",async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(STKChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(STKChannel.options.address, transfer).send({from: allAccounts[3]});
            
            const amount = 5;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, STKChannel.options.address, signersPk);
            
            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:accounts[5]});
                assert.fail("Non channel participant should not be able to close an open channel with a valid signature");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        })

        it("Cannot close open channel without signature", async() => 
        { 
            try 
            {
                await STKChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({from:accounts[3]}); 
                assert.fail("Cannot close without signature"); 
            } 
            catch (error) 
            { 
                assertRevert(error); 
                assert.ok(true); 
            }
        })
        
        it("Cannot close a channel with an invalid signature",async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(STKChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(STKChannel.options.address, transfer).send({from: allAccounts[3]});
            
            nonce++;
            const amount = 5;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, STKChannel.options.address, nonParticipant);
            
            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:accounts[5]});
                assert.fail("Self signed signature should be invalid");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        })

        it("Cannot close a closed channel with valid signature", async() =>
        {
            nonce++;
            const amount = 2;
            
            const properClose = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            await STKChannel.methods.close(ERC20Token.options.address,nonce,amount,properClose.v,properClose.r,properClose.s,true).send({from:allAccounts[1]});
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:allAccounts[5]});
                assert.fail("Proper signed signature should not be able to close an already closed channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Cannot close a closed channel without signature", async() => 
        { 
            try 
            {
                await STKChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({from:accounts[3]}); 
                assert.fail("Cannot close an already closed channel without signature"); 
            } 
            catch (error) 
            { 
                assertRevert(error); 
                assert.ok(true); 
            }
        })        

        it("Cannot close without signature on closed channel", async() => 
        {
            try 
            {
                await STKChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({from:accounts[3]}); 
                assert.fail("Cannot close without signature"); 
            } 
            catch (error) 
            { 
                assertRevert(error); 
                assert.ok(true); 
            }
        }); 

        it("Cannot contest an open channel with a valid signature",async() =>
        {
            nonce++;
            const amount = 2;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, STKChannel.options.address, signersPk);
            
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:accounts[5]});
                assert.fail("Non channel participant should not be able to change the state of an open channel");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        })        

        it("Cannot contest an open channel with an invalid signature",async() =>
        {
            nonce++;
            const amount = 2;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, STKChannel.options.address, nonParticipant);
            
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:accounts[5]});
                assert.fail("Non channel participant should not be able to change the state of an open channel");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        })         
        
        it("Cannot settle an open channel",async() =>
        {
            nonce++;
            const amount = 2;
            
            try
            {
                await STKChannel.methods.settle(ERC20Token.options.address).send({from:accounts[5]});
                assert.fail("Non channel participant should not be able to change the state of an open channel");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        })          
        
        it("Cannot close a closed channel with invalid signature", async() =>
        {
            nonce++;
            const amount = 2;
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:allAccounts[5]});
                assert.fail("Improperly signed signature should not be able to close an already closed channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Cannot contest channel with valid signature", async() =>
        {
            nonce++;
            const amount = 2;
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:allAccounts[5]});
                assert.fail("Non channel participant should not be able to contest channel with valid signature");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });        
        
        it("Cannot contest channel with valid signature", async() =>
        {
            nonce++;
            const amount = 2;
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:allAccounts[5]});
                assert.fail("Should not be able to contest channel with invalid signature");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });        
        
        it("Cannot contest channel with invalid signature", async() =>
        {
            nonce++;
            const amount = 2;
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,nonParticipant);
            
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:allAccounts[5]});
                assert.fail("Non channel participant should not be able to contest");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });     

        it("Cannot settle a closed channel", async() =>
        {   
            try
            {
                await STKChannel.methods.settle(ERC20Token.options.address).send({from:allAccounts[5]});
                assert.fail("Non channel participant cannot change state of channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });     

    });